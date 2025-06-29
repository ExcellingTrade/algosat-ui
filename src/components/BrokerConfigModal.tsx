"use client";

import { useState, useEffect } from "react";
import { X, Eye, EyeOff, Lock, Shield, AlertTriangle } from "lucide-react";
import { apiClient } from "../lib/api";

interface BrokerConfigField {
  field_name: string;
  field_type: string;
  is_required: boolean;
  description?: string;
}

interface BrokerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  brokerName: string;
  onSuccess: () => void;
}

export function BrokerConfigModal({ isOpen, onClose, brokerName, onSuccess }: BrokerConfigModalProps) {
  const [configFields, setConfigFields] = useState<BrokerConfigField[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConfigFields();
    }
  }, [isOpen, brokerName]);

  const fetchConfigFields = async () => {
    try {
      // Get broker credentials configuration from the broker_credentials table
      const credentialsConfig = await apiClient.getBrokerCredentials(brokerName);
      
      if (credentialsConfig.required_auth_fields && Array.isArray(credentialsConfig.required_auth_fields)) {
        // Transform the string array into BrokerConfigField objects
        const transformedFields: BrokerConfigField[] = credentialsConfig.required_auth_fields.map((fieldName: string) => {
          // Determine field type based on field name
          let fieldType = "string";
          let description = `Enter your ${fieldName.replace(/_/g, ' ')}`;
          
          if (fieldName.toLowerCase().includes('password') || 
              fieldName.toLowerCase().includes('secret') || 
              fieldName.toLowerCase().includes('key') ||
              fieldName.toLowerCase().includes('pin') ||
              fieldName.toLowerCase().includes('totp')) {
            fieldType = "password";
            description = `Enter your ${fieldName.replace(/_/g, ' ')} (will be encrypted)`;
          }
          
          return {
            field_name: fieldName,
            field_type: fieldType,
            is_required: true,
            description: description
          };
        });
        
        setConfigFields(transformedFields);
        
        // Initialize form data
        const initialData: Record<string, string> = {};
        const initialShow: Record<string, boolean> = {};
        transformedFields.forEach((field: BrokerConfigField) => {
          initialData[field.field_name] = "";
          initialShow[field.field_name] = field.field_type !== "password";
        });
        setFormData(initialData);
        setShowValues(initialShow);
      } else {
        throw new Error("No required auth fields configuration found");
      }
    } catch (err) {
      console.error("Error fetching broker config fields:", err);
      
      // Fallback to common fields if API fails
      const fallbackFields: BrokerConfigField[] = [
        { field_name: "api_key", field_type: "password", is_required: true, description: "API Key from broker portal" },
        { field_name: "api_secret", field_type: "password", is_required: true, description: "API Secret from broker portal" },
        { field_name: "client_id", field_type: "string", is_required: true, description: "Client ID" },
      ];
      
      setConfigFields(fallbackFields);
      
      // Initialize form data for fallback
      const initialData: Record<string, string> = {};
      const initialShow: Record<string, boolean> = {};
      fallbackFields.forEach(field => {
        initialData[field.field_name] = "";
        initialShow[field.field_name] = field.field_type !== "password";
      });
      setFormData(initialData);
      setShowValues(initialShow);
      
      setError("Using default configuration fields. Please contact support if you need specific fields for this broker.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      const missingFields = configFields
        .filter(field => field.is_required && !formData[field.field_name])
        .map(field => field.field_name);

      if (missingFields.length > 0) {
        setError(`Missing required fields: ${missingFields.join(", ")}`);
        setLoading(false);
        return;
      }

      // Update broker configuration
      await apiClient.updateBroker(brokerName, {
        config: formData
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update broker configuration");
    } finally {
      setLoading(false);
    }
  };

  const toggleShowValue = (fieldName: string) => {
    setShowValues(prev => ({
      ...prev,
      [fieldName]: !prev[fieldName]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card-background)] border border-[var(--border)] rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">
                Configure {brokerName}
              </h2>
              <p className="text-[var(--muted-foreground)] text-sm">
                Update broker credentials and settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--accent)]/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Warning */}
        <div className="m-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-amber-400 font-semibold text-sm">Security Notice</h3>
              <p className="text-amber-400/80 text-xs mt-1">
                Your credentials are encrypted and stored securely. Never share your API keys with anyone.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {configFields.map((field) => (
            <div key={field.field_name} className="space-y-2">
              <label className="block text-sm font-medium text-[var(--foreground)]">
                {field.field_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                {field.is_required && <span className="text-red-400 ml-1">*</span>}
              </label>
              
              <div className="relative">
                <input
                  type={field.field_type === "password" && !showValues[field.field_name] ? "password" : "text"}
                  value={formData[field.field_name] || ""}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    [field.field_name]: e.target.value
                  }))}
                  className={`w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none ${
                    field.field_type === "password" ? "pr-20" : "pr-12"
                  }`}
                  placeholder={`Enter ${field.field_name.replace(/_/g, ' ')}`}
                  required={field.is_required}
                />
                
                {field.field_type === "password" && (
                  <button
                    type="button"
                    onClick={() => toggleShowValue(field.field_name)}
                    className="absolute right-10 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--accent)]/10 rounded transition-colors"
                  >
                    {showValues[field.field_name] ? (
                      <EyeOff className="w-4 h-4 text-[var(--muted-foreground)]" />
                    ) : (
                      <Eye className="w-4 h-4 text-[var(--muted-foreground)]" />
                    )}
                  </button>
                )}
                
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] opacity-50" />
              </div>
              
              {field.description && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  {field.description}
                </p>
              )}
            </div>
          ))}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-[var(--border)] rounded-lg text-[var(--foreground)] hover:bg-[var(--accent)]/10 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Config"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
