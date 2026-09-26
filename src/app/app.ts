import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadoService } from './services/empleado.service';
import { Empleado, NuevoEmpleado } from './models/empleado.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly empleadoService = inject(EmpleadoService);

  readonly title = 'Sistema de Gestión de Empleados';

  // Estados de datos
  readonly empleados = signal<Empleado[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);

  // Filtros y búsqueda
  readonly searchTerm = signal<string>('');
  readonly selectedDepartment = signal<string>('todos');

  // Formulario y modo edición
  readonly isEditing = signal<boolean>(false);
  readonly currentEditingId = signal<string | null>(null);
  formData: NuevoEmpleado = {
    nombre: '',
    cargo: '',
    departamento: 'Tecnología',
    sueldo: 1500
  };

  // Departamentos predefinidos para agilizar selección
  readonly availableDepartments = [
    'Tecnología',
    'Recursos Humanos',
    'Finanzas',
    'Marketing',
    'Ventas',
    'Operaciones',
    'QA',
    'Gerencia'
  ];

  // Notificaciones y confirmación
  readonly feedback = signal<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  readonly pendingDelete = signal<Empleado | null>(null);

  // Empleados ordenados (los más recientes primero) y filtrados
  readonly filteredEmpleados = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const dept = this.selectedDepartment();
    let list = this.empleados();

    if (dept !== 'todos') {
      list = list.filter((e) => e.departamento.toLowerCase() === dept.toLowerCase());
    }

    if (term) {
      list = list.filter(
        (e) =>
          e.nombre.toLowerCase().includes(term) ||
          e.cargo.toLowerCase().includes(term) ||
          e.departamento.toLowerCase().includes(term)
      );
    }

    // Ordenar siempre los más nuevos primero
    return [...list].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  });

  // Estadísticas del Dashboard
  readonly totalEmpleados = computed(() => this.empleados().length);
  readonly totalSueldos = computed(() =>
    this.empleados().reduce((acc, curr) => acc + (Number(curr.sueldo) || 0), 0)
  );
  readonly promedioSueldo = computed(() => {
    const total = this.totalEmpleados();
    return total > 0 ? this.totalSueldos() / total : 0;
  });
  readonly totalDepartamentos = computed(() => {
    const depts = new Set(this.empleados().map((e) => e.departamento.trim()));
    return depts.size;
  });

  ngOnInit(): void {
    this.cargarEmpleados();
  }

  cargarEmpleados(): void {
    this.isLoading.set(true);
    this.empleadoService.getEmpleados().subscribe({
      next: (data) => {
        // Ordenar con el último agregado en la parte superior
        const sorted = (data || []).sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        this.empleados.set(sorted);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar empleados:', err);
        this.showFeedback('error', 'No se pudieron cargar los empleados desde el servidor.');
        this.isLoading.set(false);
      }
    });
  }

  submitForm(): void {
    if (!this.formData.nombre.trim()) {
      this.showFeedback('error', 'El nombre es obligatorio.');
      return;
    }
    if (!this.formData.cargo.trim()) {
      this.showFeedback('error', 'El cargo es obligatorio.');
      return;
    }
    if (!this.formData.departamento.trim()) {
      this.showFeedback('error', 'El departamento es obligatorio.');
      return;
    }
    if (this.formData.sueldo == null || this.formData.sueldo <= 0) {
      this.showFeedback('error', 'El sueldo debe ser mayor a 0.');
      return;
    }

    this.isSaving.set(true);

    if (this.isEditing() && this.currentEditingId()) {
      const id = this.currentEditingId()!;
      this.empleadoService.updateEmpleado(id, this.formData).subscribe({
        next: (updated) => {
          this.empleados.update((list) =>
            list.map((emp) => (emp._id === id ? { ...emp, ...updated } : emp))
          );
          this.showFeedback('success', `Empleado "${updated.nombre}" actualizado correctamente.`);
          this.cancelEdit();
          this.isSaving.set(false);
        },
        error: (err) => {
          console.error('Error al actualizar empleado:', err);
          this.showFeedback('error', 'Error al actualizar el empleado.');
          this.isSaving.set(false);
        }
      });
    } else {
      this.empleadoService.createEmpleado(this.formData).subscribe({
        next: (created) => {
          // El nuevo empleado se ubica inmediatamente en la parte superior
          this.empleados.update((list) => [created, ...list]);
          this.showFeedback('success', `Empleado "${created.nombre}" creado exitosamente.`);
          this.resetForm();
          this.isSaving.set(false);
        },
        error: (err) => {
          console.error('Error al crear empleado:', err);
          this.showFeedback('error', 'Error al registrar el empleado.');
          this.isSaving.set(false);
        }
      });
    }
  }

  editEmpleado(emp: Empleado): void {
    this.isEditing.set(true);
    this.currentEditingId.set(emp._id || null);
    this.formData = {
      nombre: emp.nombre,
      cargo: emp.cargo,
      departamento: emp.departamento,
      sueldo: emp.sueldo
    };

    // Scroll suave hacia el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    this.currentEditingId.set(null);
    this.resetForm();
  }

  resetForm(): void {
    this.formData = {
      nombre: '',
      cargo: '',
      departamento: 'Tecnología',
      sueldo: 1500
    };
  }

  requestDelete(emp: Empleado): void {
    this.pendingDelete.set(emp);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const emp = this.pendingDelete();
    if (!emp || !emp._id) {
      this.cancelDelete();
      return;
    }

    this.empleadoService.deleteEmpleado(emp._id).subscribe({
      next: () => {
        this.empleados.update((list) => list.filter((item) => item._id !== emp._id));
        this.showFeedback('info', `Empleado "${emp.nombre}" eliminado correctamente.`);
        if (this.currentEditingId() === emp._id) {
          this.cancelEdit();
        }
        this.cancelDelete();
      },
      error: (err) => {
        console.error('Error al eliminar empleado:', err);
        this.showFeedback('error', 'No se pudo eliminar el empleado.');
        this.cancelDelete();
      }
    });
  }

  showFeedback(type: 'success' | 'error' | 'info', text: string): void {
    this.feedback.set({ type, text });
    setTimeout(() => {
      if (this.feedback()?.text === text) {
        this.feedback.set(null);
      }
    }, 4500);
  }

  closeFeedback(): void {
    this.feedback.set(null);
  }
}
