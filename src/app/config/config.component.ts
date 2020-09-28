import { Component, OnInit } from '@angular/core';
import { Validators, FormControl, FormGroup } from '@angular/forms';
import { Title } from "@angular/platform-browser";
import { CookieService } from 'ngx-cookie-service';
// Home Inventory
import { ElasticSearchService } from '../elasticsearch.service';
@Component({
  selector: 'app-config',
  templateUrl: './config.component.html'
})
export class ConfigComponent implements OnInit {
  public connectionStatus = false;
  public esDefaultUrl: string;

  constructor(private titleService: Title, private esService: ElasticSearchService, private cookieService: CookieService) {
    this.titleService.setTitle("Home Inventory | Manage your Home");
    this.esService.createConnection();
    this.esDefaultUrl = this.cookieService.get('es-server');
  }

  ngOnInit() {
    this.esService.connectionStatus.subscribe(status => this.connectionStatus = status);
  }

  public displayConnectStatus = 'none';
  public disableConnectBtn = false;

  // Page Form
  elasticSearchInfoForm = new FormGroup({
    esUrl: new FormControl(this.cookieService.get('es-server'), [Validators.required]),
    username: new FormControl(''),
    password: new FormControl(''),
  });

  // Search
  esConnectClick() {
    this.disableConnectBtn = true;
    let username = this.elasticSearchInfoForm.controls.username.value,
      password = this.elasticSearchInfoForm.controls.password.value,
      hashedAuth = btoa(username + ':' + password);
    this.cookieService.set('es-server', this.elasticSearchInfoForm.controls.esUrl.value, 90);
    if (username && password) {
      this.cookieService.set('es-auth', hashedAuth, 20);
    } else {
      this.deleteCookieClick()
    }
    this.esService.createConnection().then(() => this.disableConnectBtn = false);
  }

  deleteCookieClick() {
    this.cookieService.delete('es-auth');
  }

}
