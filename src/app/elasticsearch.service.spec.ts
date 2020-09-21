import { TestBed } from '@angular/core/testing';

import { ElasticSearchService } from './elasticsearch.service';

describe('ElasticSearchService', () => {
  let service: ElasticSearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ElasticSearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
