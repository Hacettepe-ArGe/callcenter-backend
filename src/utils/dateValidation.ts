export const validateEmissionDate = (date: Date): { isValid: boolean; message?: string } => {
  const now = new Date();
  const emissionDate = new Date(date);

  // Don't allow future dates
  if (emissionDate > now) {
    return { 
      isValid: false, 
      message: 'Cannot register emissions for future dates' 
    };
  }

  // Don't allow dates more than 1 year old
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);
  
  if (emissionDate < oneYearAgo) {
    return { 
      isValid: false, 
      message: 'Cannot register emissions older than one year' 
    };
  }

  return { isValid: true };
}; 