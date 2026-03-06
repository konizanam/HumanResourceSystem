import { Request } from 'express';

// For route parameters (req.params)
export function getStringParam(req: Request, paramName: string): string {
  const param = req.params[paramName];
  return Array.isArray(param) ? param[0] : param;
}

export function getOptionalStringParam(req: Request, paramName: string): string | undefined {
  const param = req.params[paramName];
  if (!param) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

// For query parameters (req.query) - FIXED VERSION
export function getQueryString(req: Request, queryName: string): string | undefined {
  const query = req.query[queryName];
  
  // If query doesn't exist
  if (query === undefined || query === null) {
    return undefined;
  }
  
  // If it's a string, return it
  if (typeof query === 'string') {
    return query;
  }
  
  // If it's an array, take the first element if it's a string
  if (Array.isArray(query) && query.length > 0) {
    const firstItem = query[0];
    return typeof firstItem === 'string' ? firstItem : undefined;
  }
  
  // If it's a ParsedQs object, try to convert
  if (typeof query === 'object') {
    // Try to get the first value if it's a nested object
    const values = Object.values(query);
    if (values.length > 0) {
      const firstValue = values[0];
      return typeof firstValue === 'string' ? firstValue : undefined;
    }
  }
  
  return undefined;
}

export function getQueryNumber(req: Request, queryName: string): number | undefined {
  const value = getQueryString(req, queryName);
  if (value === undefined) return undefined;
  const num = Number(value);
  return isNaN(num) ? undefined : num;
}

export function getQueryBoolean(req: Request, queryName: string): boolean | undefined {
  const value = getQueryString(req, queryName);
  if (value === undefined) return undefined;
  return value === 'true' || value === '1';
}

export function getQueryArray(req: Request, queryName: string): string[] {
  const query = req.query[queryName];
  
  if (!query) return [];
  
  if (Array.isArray(query)) {
    return query.filter(item => typeof item === 'string') as string[];
  }
  
  if (typeof query === 'string') {
    return [query];
  }
  
  return [];
}