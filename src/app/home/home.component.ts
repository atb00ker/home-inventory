import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Validators } from '@angular/forms';
import { Title } from "@angular/platform-browser";

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  constructor(private titleService: Title) {
    this.titleService.setTitle("Home Inventory | Manage your Home");
  }

  public displayConnectStatus = 'none';
  public disableConnectBtn = false;

  // Page Form
  searchItem = new FormControl('', [Validators.required]);

  // Search
  esUrlConnectClick() {
    this.disableConnectBtn = true;
    this.displayConnectStatus = 'progress';
  }
}
