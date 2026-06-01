import { Component } from '@angular/core';
import { FirstHomeComponent } from '../../components/first-home/first-home.component';
import { SecondHomeComponent } from '../../components/second-home/second-home.component';
import { ThirdHomeComponent } from '../../components/third-home/third-home.component';
;

@Component({
  selector: 'app-home-page',
  imports: [FirstHomeComponent, SecondHomeComponent, ThirdHomeComponent,],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent {

}
