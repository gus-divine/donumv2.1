'use client';

interface PersonalInfoSectionProps {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onDateOfBirthChange: (value: string) => void;
  onAddressLine1Change: (value: string) => void;
  onAddressLine2Change: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onZipCodeChange: (value: string) => void;
}

export function PersonalInfoSection({
  firstName,
  lastName,
  phone,
  dateOfBirth,
  addressLine1,
  addressLine2,
  city,
  state,
  zipCode,
  onFirstNameChange,
  onLastNameChange,
  onPhoneChange,
  onDateOfBirthChange,
  onAddressLine1Change,
  onAddressLine2Change,
  onCityChange,
  onStateChange,
  onZipCodeChange,
}: PersonalInfoSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label htmlFor="firstName" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="lastName" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
            placeholder="(555) 123-4567"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="dateOfBirth" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Date of Birth
          </label>
          <input
            id="dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => onDateOfBirthChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="addressLine1" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Address Line 1
        </label>
        <input
          id="addressLine1"
          type="text"
          value={addressLine1}
          onChange={(e) => onAddressLine1Change(e.target.value)}
          className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="addressLine2" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
          Address Line 2
        </label>
        <input
          id="addressLine2"
          type="text"
          value={addressLine2}
          onChange={(e) => onAddressLine2Change(e.target.value)}
          className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label htmlFor="city" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            City
          </label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="state" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            State
          </label>
          <input
            id="state"
            type="text"
            value={state}
            onChange={(e) => onStateChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="zipCode" className="block text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            ZIP Code
          </label>
          <input
            id="zipCode"
            type="text"
            value={zipCode}
            onChange={(e) => onZipCodeChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--core-blue)] focus:border-transparent transition-all"
          />
        </div>
      </div>
    </div>
  );
}
