import { Component, OnInit } from '@angular/core';
import { Validators, FormControl } from '@angular/forms';
import { Title } from "@angular/platform-browser";
import { CookieService } from 'ngx-cookie-service';
// Home Inventory
import { ElasticSearchService } from '../elasticsearch.service';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss']
})
export class AddComponent implements OnInit {

  public connectionStatus = false;
  public homeList = [];
  public floorList = [];

  constructor(private titleService: Title, private esService: ElasticSearchService, private cookieService: CookieService) {
    this.titleService.setTitle("Home Inventory | Add Intentory Items");
  }

  ngOnInit() {
    this.esService.connectionStatus.subscribe(status => this.connectionStatus = status);
    this.esService.latestHomeList.subscribe(homeList => this.homeList = homeList);
    this.esService.latestFloorList.subscribe(floorList => this.floorList = floorList);
  }

  public formToDisplay = 'none';
  public displayAddStatus = 'none';
  public disableSubmitBtn = false;
  public errorMessage = 'Unknown Error';

  // Page Form
  addHome = new FormControl('', [Validators.required]);
  addFloor = new FormControl('', [Validators.required]);
  selectedHome = new FormControl('', [Validators.required]);

  // Form Submit

  /// Form Selector
  showFormSelector(event: any) {
    this.formToDisplay = event.target.value;
    if (this.formToDisplay == 'error') {
      this.displayAddStatus = 'error';
      this.errorMessage = 'Please select a valid option to show the form to add data.';
    }
    else {
      this.displayAddStatus = 'none';
      this.errorMessage = '';
      this.esService.periodicFunctions();
    }
  }

  /// Add Home Form
  addHomeClick() {
    if (this.homeList.indexOf(this.addHome.value) !== -1) {
      this.displayAddStatus = 'error';
      this.errorMessage = 'Home already exists in the Elastic Search Server.';
    }
    else {
      this.addItem('home', this.addHome.value);
    }
  }

  /// Add Floor Form
  addFloorClick() {
    this.addItem('floor', this.addFloor.value);
  }

  /// Add Home / Floor Common
  addItem(fieldName, fieldValue) {
    this.displayAddStatus = 'progress';
    this.disableSubmitBtn = true;
    this.esService.addNewLocationItem(fieldName, fieldValue)
      .then(() => this.displayAddStatus = 'success')
      .catch(error => {
        this.displayAddStatus = 'error';
        this.errorMessage = error.message;
        console.error('Error: ' + error.message);
      })
      .finally(() => this.disableSubmitBtn = false);
  }
}
