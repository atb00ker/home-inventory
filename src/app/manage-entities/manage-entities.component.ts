import { Component, OnInit } from '@angular/core';
import { Validators, FormControl, FormGroup } from '@angular/forms';
import { Title } from "@angular/platform-browser";
import { ActivatedRoute, Router } from '@angular/router';
import { AppRoutes } from '../app.routes';
import { Md5 } from 'ts-md5';
// Home Inventory
import { ElasticSearchService } from '../elasticsearch.service';

@Component({
  selector: 'app-manage-entities',
  templateUrl: './manage-entities.component.html'
})
export class ManageEntitiesComponent implements OnInit {
  public uuidInQuery: string;
  public HOME_PATH = '/' + AppRoutes.home;
  public MANAGE_PATH = '/' + AppRoutes.manage;
  public connectionStatus = false;
  public homeList = [];
  public roomList = [];

  public formToDisplay = 'none';
  public displayAddStatus = 'none';
  public disableSubmitBtn = false;
  public uuidMsg: string | Int32Array;
  public successMessage = 'Operation Successful!';
  public errorMessage = 'Unknown Error';

  constructor(private titleService: Title, private esService: ElasticSearchService, private route: ActivatedRoute, private router: Router) {
    this.titleService.setTitle("Home Inventory | Add Intentory Items");
    this.route.queryParams.subscribe(params => {
      if (params.uuid) {
        this.formToDisplay = 'manage-inventory';
        this.getIventoryItemForEdit(params.uuid, params.saved);
      } else {
        this.uuidInQuery = null;
      }
    });
  }

  ngOnInit() {
    this.esService.connectionStatus.subscribe(status => this.connectionStatus = status);
    this.esService.latestHomeList.subscribe(homeList => this.homeList = homeList);
    this.esService.latestRoomList.subscribe(roomList => this.roomList = roomList);
  }

  // Form Selector
  showFormSelector(inputValue: string) {
    this.formToDisplay = inputValue;
    if (this.formToDisplay == 'error') {
      this.displayAddStatus = 'error';
      this.errorMessage = 'Please select a valid option to show the form to add data.';
    } else {
      this.displayAddStatus = 'none';
      this.errorMessage = '';
      this.router.navigate([this.MANAGE_PATH]);
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
    this.filteredRoomListForEditRoomForm = this.esService
      .getRoomListForHome(this.editRoomForm.controls.selectHomeForEdit.value, this.roomList);
  }

  // Manage Home / Room Common
  manageLocationHandler(action: string, fieldName: string, fieldValue: string, newName: string = '') {
    let successMsg = 'Operation to ' + action + ' ' + fieldName + ' completed!',
      actionPromise = this.esService.manageLocation(action, fieldName, fieldValue, newName)
    this.actionPromiseHandler(successMsg, actionPromise);
  }

  // Manage Inventory Section
  public filteredRoomListForAddInventoryForm: Array<string>;
  public filteredRoomListForEditInventoryForm: Array<string>;
  inventoryItemUUIDForEdit = new FormControl('', [Validators.required]);
  addInventoryForm = new FormGroup({
    selectHomeForItem: new FormControl(this.homeList, [Validators.required]),
    selectRoomForItem: new FormControl(this.roomList, [Validators.required]),
    name: new FormControl('', [Validators.required]),
    landmark: new FormControl(''),
    description: new FormControl(''),
    count: new FormControl('', [Validators.pattern("^[0-9]*$")]),
  });
  editInventoryForm = new FormGroup({
    selectHomeForItem: new FormControl(this.homeList, [Validators.required]),
    selectRoomForItem: new FormControl(this.roomList, [Validators.required]),
    name: new FormControl('', [Validators.required]),
    landmark: new FormControl(''),
    description: new FormControl(''),
    count: new FormControl('', [Validators.pattern("^[0-9]*$")]),
  });

  getRoomsForAddInventoryForm() {
    this.filteredRoomListForAddInventoryForm = this.esService
      .getRoomListForHome(this.addInventoryForm.controls.selectHomeForItem.value, this.roomList);
  }

  getRoomsForEditInventoryForm() {
    this.filteredRoomListForEditInventoryForm = this.esService
      .getRoomListForHome(this.editInventoryForm.controls.selectHomeForItem.value, this.roomList);
  }

  manageInventoryItem(action: string) {
    let successMsg = 'Operation to ' + action + ' inventory item successful!',
      form, uuidOld;
    if (action == 'add') { form = this.addInventoryForm; }
    else if (action == 'edit') { form = this.editInventoryForm; }
    let name = form.controls.name.value,
      count = form.controls.count.value,
      description = form.controls.description.value,
      landmark = form.controls.landmark.value,
      room = form.controls.selectRoomForItem.value,
      home = form.controls.selectHomeForItem.value,
      uuid = Md5.hashStr(name + count + description + landmark + home + room);
    if (action == 'add') { this.uuidMsg = uuid; }
    else if (action == 'edit') {
      this.uuidMsg = uuid;
      uuidOld = this.uuidInQuery;
    }
    let actionPromise = this.esService
      .manageInventory(action, name, description, count, landmark, room, home, uuid, uuidOld);
    this.actionPromiseHandler(successMsg, actionPromise).then(() => {
      if (action === 'edit') {
        this.router.navigate([this.MANAGE_PATH], { queryParams: { uuid: uuid, saved: true } });
      }
    });
  }

  removeInventoryItem() {
    let actionPromise = this.esService.deleteInventory(this.uuidInQuery),
      successMsg = 'Operation to delete inventory item successful!';
    this.actionPromiseHandler(successMsg, actionPromise)
  }

  searchInventoryByIdClick() {
    let uuid = this.inventoryItemUUIDForEdit.value;
    this.router.navigate([this.MANAGE_PATH], { queryParams: { uuid: uuid } })
  }

  getIventoryItemForEdit(uuid, saved) {
    this.esService.getInventoryItemByUUID(uuid)
      .then(data => {
        this.uuidInQuery = uuid;
        if (!saved) {
          this.displayAddStatus = 'none';
        }
        this.editInventoryForm.patchValue({
          name: data['_source']['name'],
          count: data['_source']['count'],
          description: data['_source']['description'],
          landmark: data['_source']['landmark'],
          selectHomeForItem: data['_source']['home']
        });
        this.getRoomsForEditInventoryForm();
        this.editInventoryForm.patchValue({
          selectRoomForItem: data['_source']['room']
        });
      })
      .catch(error => {
        console.error(error);
        this.router.navigate([this.MANAGE_PATH])
        this.errorMessage = 'Error ' + error.status + ' - ' + error.statusText;
        this.displayAddStatus = 'error';
      });
  }

  // Utility Functions
  actionPromiseHandler(successMsg: string, actionPromise: Promise<any>) {
    this.displayAddStatus = 'progress';
    this.disableSubmitBtn = true;
    return actionPromise
      .then(() => {
        this.clearAllForms();
        this.displayAddStatus = 'success';
        this.successMessage = successMsg;
      })
      .catch(error => {
        this.displayAddStatus = 'error';
        this.errorMessage = 'Error ' + error.status + ' - ' + error.statusText;
        console.error(error);
      })
      .finally(() => this.disableSubmitBtn = false);
  }

  clearAllForms() {
    this.addHome.reset();
    this.editHomeForm.reset();
    this.addRoomForm.reset();
    this.editRoomForm.reset();
    this.addInventoryForm.reset();
    this.editInventoryForm.reset();
    this.inventoryItemUUIDForEdit.reset();
  }
}
