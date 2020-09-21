
import { HostListener, Component, OnInit } from '@angular/core';
import { AppRoutes } from '../app-routing.module';
import { CookieService } from 'ngx-cookie-service';
// Home Inventory
import { ElasticSearchService } from '../elasticsearch.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss'],
})
export class NavComponent implements OnInit {

  // Path
  public HOME_PATH: string = '/' + AppRoutes.home;
  public CONFIG_PATH: string = '/' + AppRoutes.config;
  public ADD_PATH: string = '/' + AppRoutes.add;
  public collapseEnabled = 'NavBar';
  public connectionStatus = false;
  constructor(private cookieService: CookieService, private esService: ElasticSearchService) { }

  ngOnInit() {
    this.esService.connectionStatus.subscribe(status => { this.connectionStatus = status; });
    this.enableBootstrapCollapse();
  }

  @HostListener('window:resize')
  enableBootstrapCollapse() {
    if (window.innerWidth > 768) {
      this.collapseEnabled = 'NavBar';
    } else {
      this.collapseEnabled = 'collapsibleNavbar';
    }
  }
}
