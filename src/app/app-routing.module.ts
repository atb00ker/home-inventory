import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
// Components
import { HomeComponent } from './home/home.component';
import { ConfigComponent } from './config/config.component';
import { ManageEntitiesComponent } from './manage-entities/manage-entities.component';

export class AppRoutes {
  public static home = 'home';
  public static config = 'config';
  public static manage = 'manage';
}

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: AppRoutes.home, component: HomeComponent },
  { path: AppRoutes.config, component: ConfigComponent },
  { path: AppRoutes.manage, component: ManageEntitiesComponent },
  { path: '**', component: HomeComponent },
];

export const RoutedComponents = [HomeComponent, ConfigComponent, ManageEntitiesComponent];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule { }
