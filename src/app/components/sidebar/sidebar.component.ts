import { Component, ElementRef, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, UserProfile } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  standalone: true,
  imports: [RouterModule, CommonModule]
})
export class SidebarComponent implements AfterViewInit {
  @ViewChild('sidebar') sidebarElement!: ElementRef<HTMLElement>;
  
  isCollapsed = false;
  isMenuActive = false;
  showLogoutConfirm = false;

  userProfile: UserProfile | null = null;
  isLoading = false;
  errorMessage = '';
  
  // Constantes para las alturas
  readonly collapsedSidebarHeight: string = "56px";
  readonly fullSidebarHeight: string = "calc(100vh - 32px)";
  
  // Texto del botón de menú
  menuText: string = "menu";
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}
  
  ngAfterViewInit(): void {
    // Inicializar después de que las vistas estén cargadas
    this.checkScreenSize();
    this.loadUserProfile();
  }
  
  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }
  
  toggleMenu(): void {
    this.isMenuActive = !this.isMenuActive;
    this.menuText = this.isMenuActive ? "close" : "menu";
    this.updateSidebarHeight();
  }
  
  updateSidebarHeight(): void {
    const sidebar = this.sidebarElement.nativeElement;
    
    if (this.isMenuActive) {
      sidebar.style.height = `${sidebar.scrollHeight}px`;
    } else {
      sidebar.style.height = this.collapsedSidebarHeight;
    }
  }
  
  @HostListener('window:resize')
  checkScreenSize(): void {
    const sidebar = this.sidebarElement.nativeElement;
    
    if (window.innerWidth >= 1024) {
      sidebar.style.height = this.fullSidebarHeight;
    } else {
      this.isCollapsed = false;
      sidebar.style.height = "auto";
      this.updateSidebarHeight();
    }
  }

  loadUserProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.getUserProfile().subscribe({
      next: (response) => {
        if (response.email) {
          this.userProfile = {
            email: response.email,
            rol: response.rol!,
              fechaIngreso: response.fechaIngreso instanceof Date 
                ? response.fechaIngreso.toISOString() 
                : response.fechaIngreso!,
              estado: response.estado!
            };
        } else {
          this.errorMessage = response.message || 'Error al cargar el perfil';
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar perfil:', error);
        this.errorMessage = 'Error al cargar el perfil del usuario';
        this.isLoading = false;
        
        if (error.status === 401) {
          this.authService.logout().subscribe({
            next: () => this.router.navigate(['/login']),
            error: () => {
              this.authService.clearAuthData();
              this.router.navigate(['/login']);
            }
          });
        }
      }
    });
  }

  showLogoutConfirmation(): void {
    this.showLogoutConfirm = true;
  }

  cancelLogout(): void {
    this.showLogoutConfirm = false;
  }
  
  onLogout(event: Event): void {
    event.preventDefault();
    this.showLogoutConfirm = true;
  }

  confirmLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (error) => {
        console.error('Error en logout:', error);
        this.authService.clearAuthData();
        this.router.navigate(['/login']);
      }
    });
  }

  refreshProfile(): void {
    this.loadUserProfile();
  }

  openSupportEmail(): void {
    const email = 'greentechonesystem@gmail.com';
    const subject = 'Soporte Técnico - GreenTech';
    const body = `Estimado equipo de soporte,

  Me pongo en contacto para solicitar ayuda con el sistema GreenTech. 
  A continuación, incluyo mis datos y una breve descripción del problema:

  Información del usuario:
  - Usuario: ${this.userProfile?.email || 'No disponible'}
  - Rol: ${this.userProfile?.rol || 'No disponible'}

  Descripción del problema:
  [Por favor describa aquí su consulta o inconveniente]

  Muchas gracias por su atención.`;

    //Gmail web (recomendado)
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank');

    // Cliente predeterminado de correo (suele ser menos fiable)
    // const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // window.location.href = mailtoLink;
  }
}