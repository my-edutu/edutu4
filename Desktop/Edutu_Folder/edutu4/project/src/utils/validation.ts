export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validation = {
  // Validate email format
  email(email: string): ValidationResult {
    if (!email) {
      return { isValid: false, error: 'Email is required' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }
    
    return { isValid: true };
  },

  // Validate password
  password(password: string): ValidationResult {
    if (!password) {
      return { isValid: false, error: 'Password is required' };
    }
    
    if (password.length < 6) {
      return { isValid: false, error: 'Password must be at least 6 characters long' };
    }
    
    return { isValid: true };
  },

  // Validate name
  name(name: string): ValidationResult {
    if (!name) {
      return { isValid: false, error: 'Name is required' };
    }
    
    if (name.trim().length < 2) {
      return { isValid: false, error: 'Name must be at least 2 characters long' };
    }
    
    return { isValid: true };
  },

  // Validate age (16-30 for Edutu)
  age(age: string | number): ValidationResult {
    const numAge = typeof age === 'string' ? parseInt(age) : age;
    
    if (!age || isNaN(numAge)) {
      return { isValid: false, error: 'Age is required' };
    }
    
    if (numAge < 16) {
      return { isValid: false, error: 'You must be at least 16 years old to use Edutu' };
    }
    
    if (numAge > 30) {
      return { isValid: false, error: 'Edutu is designed for users aged 16-30' };
    }
    
    return { isValid: true };
  },

  // Validate all form fields at once
  signUpForm(data: { name: string; email: string; password: string; age: string }): { [key: string]: string } {
    const errors: { [key: string]: string } = {};
    
    const nameResult = this.name(data.name);
    if (!nameResult.isValid) errors.name = nameResult.error!;
    
    const emailResult = this.email(data.email);
    if (!emailResult.isValid) errors.email = emailResult.error!;
    
    const passwordResult = this.password(data.password);
    if (!passwordResult.isValid) errors.password = passwordResult.error!;
    
    const ageResult = this.age(data.age);
    if (!ageResult.isValid) errors.age = ageResult.error!;
    
    return errors;
  },

  // Validate sign in form
  signInForm(data: { email: string; password: string }): { [key: string]: string } {
    const errors: { [key: string]: string } = {};
    
    const emailResult = this.email(data.email);
    if (!emailResult.isValid) errors.email = emailResult.error!;
    
    const passwordResult = this.password(data.password);
    if (!passwordResult.isValid) errors.password = passwordResult.error!;
    
    return errors;
  }
};