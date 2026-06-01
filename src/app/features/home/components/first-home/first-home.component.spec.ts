import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FirstHomeComponent } from './first-home.component';

describe('FirstHomeComponent', () => {
  let component: FirstHomeComponent;
  let fixture: ComponentFixture<FirstHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FirstHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FirstHomeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
