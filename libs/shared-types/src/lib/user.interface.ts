export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string; // This will be hashed
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
