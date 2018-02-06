import { TestBed, inject } from '@angular/core/testing';

import { JsonpService } from './jsonp.service';

describe('JsonpService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [JsonpService]
    });
  });

  it('should be created', inject([JsonpService], (service: JsonpService) => {
    expect(service).toBeTruthy();
  }));
});
