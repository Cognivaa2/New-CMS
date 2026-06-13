export const generateCompanyId = (companyName) => {
  if (!companyName) return null;
  const year = new Date().getFullYear();
  const prefix = companyName
    .replace(/[^a-zA-Z ]/g, "")   
    .trim()
    .split(" ")[0]                
    .substring(0, 3)              
    .toUpperCase();
  const companyId = `${prefix}${year}`;
  return companyId;
};