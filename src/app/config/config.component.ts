import { Component, OnInit } from '@angular/core';
import { Validators, FormControl } from '@angular/forms';
import { Title } from "@angular/platform-browser";
import { CookieService } from 'ngx-cookie-service';
// Home Inventory
import { ElasticSearchService } from '../elasticsearch.service';
@Component({
  selector: 'app-config',
  templateUrl: './config.component.html',
  styleUrls: ['./config.component.scss'],
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
  esUrl = new FormControl(this.cookieService.get('es-server'), [
    Validators.required
  ]);

  // Search
  esUrlConnectClick() {
    this.disableConnectBtn = true;
    this.cookieService.set('es-server', this.esUrl.value);
    this.esService._updateStatus();
    this.disableConnectBtn = false;
  }

}
