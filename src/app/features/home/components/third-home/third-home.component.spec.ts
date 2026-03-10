import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThirdHomeComponent } from './third-home.component';

describe('ThirdHomeComponent', () => {
  let component: ThirdHomeComponent;
  let fixture: ComponentFixture<ThirdHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThirdHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThirdHomeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
