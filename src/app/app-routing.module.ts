import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
// Components
import { HomeComponent } from './home/home.component';
import { ConfigComponent } from './config/config.component';
import { AddComponent } from './add/add.component';

export class AppRoutes {
  public static home = 'home';
  public static config = 'config';
  public static add = 'add';
}

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: AppRoutes.home, component: HomeComponent },
  { path: AppRoutes.config, component: ConfigComponent },
  { path: AppRoutes.add, component: AddComponent },
  { path: '**', component: HomeComponent },
];

export const RoutedComponents = [HomeComponent, ConfigComponent, AddComponent];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule { }
