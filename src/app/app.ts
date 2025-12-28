import { Component, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from 'ng2-charts';
import { AuthService } from './auth/auth';


@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('exp-track-front');
  constructor(
    private themeService: ThemeService,
    private authService: AuthService
  ) { }


  ngOnInit(): void {

  }
  // Theme is now handled by ThemeService
  // No need to initialize here as ThemeService does it in constructor
}
