import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-first-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './first-home.component.html',
  styleUrls: ['./first-home.component.css'],
})
export class FirstHomeComponent {}
