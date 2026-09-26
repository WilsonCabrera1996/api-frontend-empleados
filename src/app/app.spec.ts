import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { EmpleadoService } from './services/empleado.service';

describe('App', () => {
  const mockEmpleadoService = {
    getEmpleados: () =>
      of([
        {
          _id: '1',
          nombre: 'Carlos Pérez',
          cargo: 'Desarrollador Backend',
          departamento: 'Tecnología',
          sueldo: 1500,
          createdAt: '2026-09-25T23:59:57.144Z'
        }
      ]),
    getEmpleadoById: (id: string) =>
      of({
        _id: id,
        nombre: 'Carlos Pérez',
        cargo: 'Desarrollador Backend',
        departamento: 'Tecnología',
        sueldo: 1500
      }),
    createEmpleado: (emp: any) =>
      of({ ...emp, _id: '2', createdAt: new Date().toISOString() }),
    updateEmpleado: (id: string, emp: any) => of({ ...emp, _id: id }),
    deleteEmpleado: (id: string) => of({ message: 'Empleado eliminado correctamente' })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: EmpleadoService, useValue: mockEmpleadoService }]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title in header', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain(
      'Sistema de Gestión de Empleados'
    );
  });

  it('should load employees and calculate stats correctly', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const app = fixture.componentInstance;
    expect(app.empleados().length).toBe(1);
    expect(app.totalEmpleados()).toBe(1);
    expect(app.totalSueldos()).toBe(1500);
    expect(app.promedioSueldo()).toBe(1500);
  });
});
