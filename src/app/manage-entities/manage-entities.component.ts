import { Component, OnInit } from '@angular/core';
import { Validators, FormControl, FormGroup } from '@angular/forms';
import { Title } from "@angular/platform-browser";
import { CookieService } from 'ngx-cookie-service';
// Home Inventory
import { ElasticSearchService } from '../elasticsearch.service';

@Component({
  selector: 'app-manage-entities',
  templateUrl: './manage-entities.component.html',
  styleUrls: ['./manage-entities.component.scss']
})
export class ManageEntitiesComponent implements OnInit {
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
  public successMessage = 'Operation Successful!';
  public errorMessage = 'Unknown Error';

  // Form Selector
  showFormSelector(inputValue: string) {
    this.formToDisplay = inputValue;
    if (this.formToDisplay == 'error') {
      this.displayAddStatus = 'error';
      this.errorMessage = 'Please select a valid option to show the form to add data.';
    }
    else {
      this.displayAddStatus = 'none';
      this.errorMessage = '';
      this.esService.periodicFunctions();
    }
    this.clearManageLocationForms();
  }

  // Manage Homes Section
  addHome = new FormControl('', [Validators.required]);
  editHomeForm = new FormGroup({
    editedHomeName: new FormControl('', [Validators.required]),
    selectHomeForEdit: new FormControl(this.homeList, [Validators.required]),
  });


  addHomeClick() {
    let createdHome = this.addHome.value;
    if (this.homeList.indexOf(createdHome) !== -1) {
      this.displayAddStatus = 'error';
      this.errorMessage = createdHome + ' already exists in the Elastic Search Server.';
    }
    else {
      this.manageLocationHandler('add', 'home', createdHome);
    }
  }

  editHomeClick() {
    let selectedHome = this.editHomeForm.controls.selectHomeForEdit.value,
      newName = this.editHomeForm.controls.editedHomeName.value;
    if (this.homeList.indexOf(selectedHome) === -1) {
      this.displayAddStatus = 'error';
      this.errorMessage = selectedHome + ' does not exist the Elastic Search Server.';
    }
    else {
      this.manageLocationHandler('edit', 'home', selectedHome, newName);
    }
  }

  removeHomeClick() {
    let response = confirm("Are you sure? All the Items in the home will be deleted!");
    if (response) {
      let selectedHome = this.editHomeForm.controls.selectHomeForEdit.value;
      if (this.homeList.indexOf(selectedHome) === -1) {
        this.displayAddStatus = 'error';
        this.errorMessage = selectedHome + ' does not exist the Elastic Search Server.';
      }
      else {
        this.manageLocationHandler('delete', 'home', selectedHome);
      }
    }
  }

  // Manage Floor Section
  addFloorForm = new FormGroup({
    addFloorField: new FormControl('', [Validators.required]),
    homeListField: new FormControl(this.homeList, [Validators.required]),
  });
  editFloorForm = new FormGroup({
    selectHomeForEdit: new FormControl(this.homeList, [Validators.required]),
    selectFloorForEdit: new FormControl(this.floorList, [Validators.required]),
    editedFloorName: new FormControl('', [Validators.required]),
  });
  public floorListFilterForEditFloor: Array<string>;

  addFloorClick() {
    let floorName = this.esService.getFloorListName(this.addFloorForm.controls.homeListField.value, this.addFloorForm.controls.addFloorField.value);
    if (this.floorList.indexOf(floorName) !== -1) {
      this.displayAddStatus = 'error';
      this.errorMessage = 'Floor already exists in the Elastic Search Server.';
    }
    else {
      this.manageLocationHandler('add', 'floor', floorName);
    }
  }

  editFloorClick() {
    let selectedHome = this.editFloorForm.controls.selectHomeForEdit.value,
      selectedFloor = this.editFloorForm.controls.selectFloorForEdit.value,
      originalFloorName = this.esService.getFloorListName(selectedHome, selectedFloor),
      newFloorName = this.esService.getFloorListName(selectedHome, this.editFloorForm.controls.editedFloorName.value);
    if (this.floorList.indexOf(originalFloorName) === -1) {
      this.displayAddStatus = 'error';
      this.errorMessage = originalFloorName + ' does not exist the Elastic Search Server.';
    } else {
      this.manageLocationHandler('edit', 'floor', originalFloorName, newFloorName);
    }
  }

  removeFloorClick() {
    let response = confirm("Are you sure? All the Items in the floor will be deleted!");
    if (response) {
      let selectedHome = this.editFloorForm.controls.selectHomeForEdit.value,
        selectedFloor = this.editFloorForm.controls.selectFloorForEdit.value,
        floorName = this.esService.getFloorListName(selectedHome, selectedFloor);
      if (this.floorList.indexOf(floorName) === -1) {
        this.displayAddStatus = 'error';
        this.errorMessage = selectedFloor + ' does not exist the Elastic Search Server.';
      }
      else {
        this.manageLocationHandler('delete', 'floor', floorName);
      }
    }
  }


  getFloorListOfHome() {
    const homeName = this.editFloorForm.controls.selectHomeForEdit.value,
      removeLength = homeName.length + 2;
    this.floorListFilterForEditFloor = this.floorList
      .filter(floorName => floorName.startsWith(homeName))
      .map(floorName => floorName.substring(removeLength));
  }

  // Manage Home / Floor Common
  manageLocationHandler(action: string, fieldName: string, fieldValue: string, newName: string = '') {
    this.displayAddStatus = 'progress';
    this.disableSubmitBtn = true;
    this.esService.manageLocation(action, fieldName, fieldValue, newName)
      .then(() => {
        this.clearManageLocationForms();
        this.displayAddStatus = 'success';
        this.successMessage = 'Operation to ' + action + ' ' + fieldName + ' completed!';
      })
      .catch(error => {
        this.displayAddStatus = 'error';
        this.errorMessage = error.message;
        console.error('Error: ' + error.message);
      })
      .finally(() => this.disableSubmitBtn = false);
  }

  // Clear Forms
  clearManageLocationForms() {
    this.addHome.reset();
    this.editHomeForm.reset();
    this.addFloorForm.reset();
    this.editFloorForm.reset();
  }
}
