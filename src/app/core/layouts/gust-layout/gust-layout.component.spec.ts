import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GustLayoutComponent } from './gust-layout.component';

describe('GustLayoutComponent', () => {
  let component: GustLayoutComponent;
  let fixture: ComponentFixture<GustLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GustLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GustLayoutComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
