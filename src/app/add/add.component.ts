import { Component, OnInit } from '@angular/core';
import { Validators, FormControl } from '@angular/forms';
import { Title } from "@angular/platform-browser";
import { CookieService } from 'ngx-cookie-service';
import { finalize } from 'rxjs/operators';
// Home Inventory
import { ElasticSearchService } from '../elasticsearch.service';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent implements OnInit {

  public connectionStatus = false;

  constructor(private titleService: Title, private esService: ElasticSearchService, private cookieService: CookieService) {
    this.titleService.setTitle("Home Inventory | Add Intentory Items");
  }

  ngOnInit() {
    this.esService.connectionStatus.subscribe(status => this.connectionStatus = status);
  }

  public displayAddStatus = 'none';
  public disableConnectBtn = false;
  public errorMessage = 'Unknown Error';

  // Page Form
  addHome = new FormControl('', [Validators.required]);

  // Search
  addHomeClick() {
    this.displayAddStatus = 'progress';
    this.disableConnectBtn = true;
    this.esService.addNewHome(this.addHome.value)
      .then(() => this.displayAddStatus = 'success')
      .catch(error => {
        this.displayAddStatus = 'error';
        this.errorMessage = error.message;
        console.error('Error: ' + error.message);
      })
      .finally(() => this.disableConnectBtn = false);
  }
}
