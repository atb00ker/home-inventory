import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
// Components
import { HomeComponent } from './home/home.component';
import { ConfigComponent } from './config/config.component';
import { ManageEntitiesComponent } from './manage-entities/manage-entities.component';
import { AboutComponent } from './about/about.component';
import { AppRoutes } from './app.routes'
const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: AppRoutes.home, component: HomeComponent },
  { path: AppRoutes.config, component: ConfigComponent },
  { path: AppRoutes.about, component: AboutComponent },
  { path: AppRoutes.manage, component: ManageEntitiesComponent },
  { path: '**', component: HomeComponent },
];

export const RoutedComponents = [HomeComponent, ConfigComponent, ManageEntitiesComponent, AboutComponent];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})

export class AppRoutingModule { }
