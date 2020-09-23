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
  public roomList = [];

  constructor(private titleService: Title, private esService: ElasticSearchService, private cookieService: CookieService) {
    this.titleService.setTitle("Home Inventory | Add Intentory Items");
  }

  ngOnInit() {
    this.esService.connectionStatus.subscribe(status => this.connectionStatus = status);
    this.esService.latestHomeList.subscribe(homeList => this.homeList = homeList);
    this.esService.latestRoomList.subscribe(roomList => this.roomList = roomList);
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
    this.clearAllForms();
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

  // Manage Room Section
  addRoomForm = new FormGroup({
    addRoomField: new FormControl('', [Validators.required]),
    homeListField: new FormControl(this.homeList, [Validators.required]),
  });
  editRoomForm = new FormGroup({
    selectHomeForEdit: new FormControl(this.homeList, [Validators.required]),
    selectRoomForEdit: new FormControl(this.roomList, [Validators.required]),
    editedRoomName: new FormControl('', [Validators.required]),
  });
  public filteredRoomListForEditRoomForm: Array<string>;

  addRoomClick() {
    let roomName = this.esService.getRoomListName(this.addRoomForm.controls.homeListField.value, this.addRoomForm.controls.addRoomField.value);
    if (this.roomList.indexOf(roomName) !== -1) {
      this.displayAddStatus = 'error';
      this.errorMessage = 'Room already exists in the Elastic Search Server.';
    }
    else {
      this.manageLocationHandler('add', 'room', roomName);
    }
  }

  editRoomClick() {
    let selectedHome = this.editRoomForm.controls.selectHomeForEdit.value,
      selectedRoom = this.editRoomForm.controls.selectRoomForEdit.value,
      originalRoomName = this.esService.getRoomListName(selectedHome, selectedRoom),
      newRoomName = this.esService.getRoomListName(selectedHome, this.editRoomForm.controls.editedRoomName.value);
    if (this.roomList.indexOf(originalRoomName) === -1) {
      this.displayAddStatus = 'error';
      this.errorMessage = originalRoomName + ' does not exist the Elastic Search Server.';
    } else {
      this.manageLocationHandler('edit', 'room', originalRoomName, newRoomName);
    }
  }

  removeRoomClick() {
    let response = confirm("Are you sure? All the Items in the room will be deleted!");
    if (response) {
      let selectedHome = this.editRoomForm.controls.selectHomeForEdit.value,
        selectedRoom = this.editRoomForm.controls.selectRoomForEdit.value,
        roomName = this.esService.getRoomListName(selectedHome, selectedRoom);
      if (this.roomList.indexOf(roomName) === -1) {
        this.displayAddStatus = 'error';
        this.errorMessage = selectedRoom + ' does not exist the Elastic Search Server.';
      }
      else {
        this.manageLocationHandler('delete', 'room', roomName);
      }
    }
  }

  getRoomsForEditRoomForm() {
    this.filteredRoomListForEditRoomForm = this.esService.getRoomListForHome(this.editRoomForm.controls.selectHomeForEdit.value, this.roomList);
  }

  // Manage Home / Room Common
  manageLocationHandler(action: string, fieldName: string, fieldValue: string, newName: string = '') {
    // TODO: Not requried now
    let successMsg = 'Operation to ' + action + ' ' + fieldName + ' completed!',
      actionPromise = this.esService.manageLocation(action, fieldName, fieldValue, newName)
    this.actionPromiseHandler(successMsg, actionPromise);
  }

  // Manage Inventory Section
  addInventoryForm = new FormGroup({
    selectHomeForItem: new FormControl(this.homeList, [Validators.required]),
    selectRoomForItem: new FormControl(this.roomList, [Validators.required]),
    name: new FormControl('', [Validators.required]),
    landmark: new FormControl(''),
    description: new FormControl(''),
    count: new FormControl('', [Validators.required, Validators.min(0)]),
  });
  public filteredRoomListForAddInventoryForm: Array<string>;

  getRoomsForAddInventoryForm() {
    this.filteredRoomListForAddInventoryForm = this.esService.getRoomListForHome(this.addInventoryForm.controls.selectHomeForItem.value, this.roomList);
  }

  manageInventoryHandler(action: string) {
    let actionPromise = this.esService.manageInventory(action, this.addInventoryForm),
      successMsg = 'Operation to ' + action + ' inventory item completed!';
    this.actionPromiseHandler(successMsg, actionPromise);
  }

  // Utility Functions
  actionPromiseHandler(successMsg: string, actionPromise: Promise<any>) {
    this.displayAddStatus = 'progress';
    this.disableSubmitBtn = true;
    actionPromise
      .then(() => {
        this.clearAllForms();
        this.displayAddStatus = 'success';
        this.successMessage = successMsg;
      })
      .catch(error => {
        this.displayAddStatus = 'error';
        this.errorMessage = 'Error ' + error.status + ' - ' + error.statusText;
        console.error('Error: ' + this.errorMessage);
      })
      .finally(() => this.disableSubmitBtn = false);
  }

  clearAllForms() {
    this.addHome.reset();
    this.editHomeForm.reset();
    this.addRoomForm.reset();
    this.editRoomForm.reset();
    this.addInventoryForm.reset();
  }
}
