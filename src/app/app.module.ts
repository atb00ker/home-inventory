
import { BrowserModule } from '@angular/platform-browser';
import { Component, NgModule } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
// Home Inventory
import { AppRoutingModule } from './app-routing.module';
import { NavComponent } from './nav/nav.component';
import { RoutedComponents } from './app-routing.module';

@Component({
  selector: 'app-root',
  template: `
  <app-nav></app-nav>
  <router-outlet></router-outlet>
  `
})
export class AppComponent {
  title = 'Home Inventory | Manage your Home';
}

@NgModule({
  declarations: [
    AppComponent,
    NavComponent,
    RoutedComponents,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
  ],
  providers: [CookieService],
  bootstrap: [AppComponent]
})
export class AppModule { }
