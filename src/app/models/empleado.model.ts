export interface Empleado {
  _id?: string;
  nombre: string;
  cargo: string;
  departamento: string;
  sueldo: number;
  createdAt?: string;
  updatedAt?: string;
}

export type NuevoEmpleado = Omit<Empleado, '_id' | 'createdAt' | 'updatedAt'>;
