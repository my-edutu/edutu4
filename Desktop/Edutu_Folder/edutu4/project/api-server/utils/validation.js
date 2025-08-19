const validateOpportunityData = (data) => {
  const errors = [];
  
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('Title is required and must be a non-empty string');
  }
  
  if (data.title && data.title.length > 200) {
    errors.push('Title must be less than 200 characters');
  }
  
  if (!data.description || typeof data.description !== 'string' || data.description.trim().length === 0) {
    errors.push('Description is required and must be a non-empty string');
  }
  
  if (data.description && data.description.length > 2000) {
    errors.push('Description must be less than 2000 characters');
  }
  
  if (!data.type || typeof data.type !== 'string') {
    errors.push('Type is required and must be a string');
  }
  
  const validTypes = ['scholarship', 'internship', 'job', 'course', 'workshop', 'bootcamp', 'certification'];
  if (data.type && !validTypes.includes(data.type.toLowerCase())) {
    errors.push(`Type must be one of: ${validTypes.join(', ')}`);
  }
  
  if (data.deadline && !(data.deadline instanceof Date) && isNaN(Date.parse(data.deadline))) {
    errors.push('Deadline must be a valid date');
  }
  
  if (data.amount && (typeof data.amount !== 'number' || data.amount < 0)) {
    errors.push('Amount must be a positive number');
  }
  
  if (data.eligibility && typeof data.eligibility !== 'string') {
    errors.push('Eligibility must be a string');
  }
  
  if (data.applicationUrl && typeof data.applicationUrl !== 'string') {
    errors.push('Application URL must be a string');
  }
  
  if (data.applicationUrl && data.applicationUrl.length > 0) {
    try {
      new URL(data.applicationUrl);
    } catch {
      errors.push('Application URL must be a valid URL');
    }
  }
  
  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('Tags must be an array');
  }
  
  if (data.tags && Array.isArray(data.tags)) {
    const invalidTags = data.tags.filter(tag => typeof tag !== 'string' || tag.trim().length === 0);
    if (invalidTags.length > 0) {
      errors.push('All tags must be non-empty strings');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

const sanitizeOpportunityData = (data) => {
  const sanitized = {};
  
  if (data.title) sanitized.title = data.title.trim();
  if (data.description) sanitized.description = data.description.trim();
  if (data.type) sanitized.type = data.type.toLowerCase().trim();
  if (data.deadline) sanitized.deadline = new Date(data.deadline);
  if (data.amount !== undefined) sanitized.amount = Number(data.amount);
  if (data.eligibility) sanitized.eligibility = data.eligibility.trim();
  if (data.applicationUrl) sanitized.applicationUrl = data.applicationUrl.trim();
  if (data.tags && Array.isArray(data.tags)) {
    sanitized.tags = data.tags.map(tag => tag.trim()).filter(tag => tag.length > 0);
  }
  if (data.organization) sanitized.organization = data.organization.trim();
  if (data.location) sanitized.location = data.location.trim();
  if (data.isActive !== undefined) sanitized.isActive = Boolean(data.isActive);
  
  return sanitized;
};

module.exports = {
  validateOpportunityData,
  sanitizeOpportunityData
};