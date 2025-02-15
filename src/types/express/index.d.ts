declare namespace Express {
  export interface Request {
    company?: {
      id: number;
      email: string;
      name: string;
    };
  }
} 