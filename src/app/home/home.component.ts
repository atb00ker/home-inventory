import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Validators } from '@angular/forms';
import { Title } from "@angular/platform-browser";
import { AppRoutes } from '../app.routes';
import { Router } from '@angular/router';
// Home Inventory
import { ElasticSearchService } from '../elasticsearch.service';
import { JsonValidator } from '../app.validators';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  public connectionStatus = false;
  public homeList: Array<string> = [];
  public roomList: Array<string> = [];
  public filteredRoomListForSearchForm: Array<string> = [];
  public listOfSearchedItems: Array<string> = [];
  public MANAGE_PATH = '/' + AppRoutes.manage;

  public displaySearchStatus = 'none';
  public displayConnectStatus = 'none';
  public displayAdvanceSearchOptions = false;
  public disableConnectBtn = false;
  public errorMsg: string;

  constructor(private titleService: Title, private esService: ElasticSearchService, private router: Router) {
    this.titleService.setTitle("Home Inventory | Manage your Home");
  }

  // Page Form
  searchForm = new FormGroup({
    searchQuery: new FormControl(''),
    searchInHome: new FormControl(''),
    searchInRoom: new FormControl(''),
    advancedSearch: new FormControl('', [JsonValidator]),
  });

  ngOnInit() {
    this.esService.connectionStatus.subscribe(status => this.connectionStatus = status);
    this.esService.latestHomeList.subscribe(homeList => this.homeList = homeList);
    this.esService.latestRoomList.subscribe(roomList => this.roomList = roomList);
  }

  showAdvanceSearchOptions() { this.displayAdvanceSearchOptions = !this.displayAdvanceSearchOptions; }

  // Search
  getRoomsForSearchForm() {
    this.filteredRoomListForSearchForm = this.esService
      .getRoomListForHome(this.searchForm.controls.searchInHome.value, this.roomList);
  }

  searchFormClick() {
    this.displaySearchStatus = 'progress';
    let searchQuery = this.searchForm.controls.searchQuery.value,
      searchInHome = this.searchForm.controls.searchInHome.value,
      searchInRoom = this.searchForm.controls.searchInRoom.value,
      advancedSearch = this.searchForm.controls.advancedSearch.value;
    this.esService.searchInInventory(searchQuery, searchInHome, searchInRoom, advancedSearch)
      .then(data => {
        this.listOfSearchedItems = data['hits']['hits'];
        this.displaySearchStatus = 'success';
      })
      .catch(error => {
        console.error(error);
        this.errorMsg = 'Error ' + error.status + ': ' + error.statusText;
        this.displaySearchStatus = 'error';
      });
  }

  editInventoryRequest(uuid: string) {
    this.router.navigate([this.MANAGE_PATH], { queryParams: { uuid: uuid } })
  }

  showCollapsedInformation(uuid) {
    return document.getElementById(uuid).classList.toggle('show');
  }
}
