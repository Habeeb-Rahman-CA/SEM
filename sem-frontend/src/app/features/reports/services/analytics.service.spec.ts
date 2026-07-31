import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AnalyticsService } from './analytics.service';
import { AuthService } from '../../auth/services/auth.service';
import { environment } from '../../../../environments/environment';
import { signal } from '@angular/core';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;
  let mockAuthService: Partial<AuthService>;

  beforeEach(() => {
    mockAuthService = {
      token: signal('fake-jwt-token'),
    } as any;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AnalyticsService, { provide: AuthService, useValue: mockAuthService }],
    });

    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call getEventReports endpoint with auth headers', () => {
    const workspaceId = 'ws-123';
    const mockResponse = { kpis: {}, eventBreakdowns: [] };

    service.getEventReports(workspaceId).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/workspaces/${workspaceId}/analytics/event-reports`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-jwt-token');
    req.flush(mockResponse);
  });

  it('should call getParticipationTrends endpoint with auth headers', () => {
    const workspaceId = 'ws-123';
    const mockResponse = { growthTrend: [] };

    service.getParticipationTrends(workspaceId).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/workspaces/${workspaceId}/analytics/participation-trends`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-jwt-token');
    req.flush(mockResponse);
  });

  it('should call getHistoricalComparisons endpoint with auth headers', () => {
    const workspaceId = 'ws-123';
    const mockResponse = { yearlyData: [] };

    service.getHistoricalComparisons(workspaceId).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/workspaces/${workspaceId}/analytics/historical-comparisons`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-jwt-token');
    req.flush(mockResponse);
  });

  it('should call getOrganizerInsights endpoint with auth headers', () => {
    const workspaceId = 'ws-123';
    const mockResponse = { productivity: [] };

    service.getOrganizerInsights(workspaceId).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/workspaces/${workspaceId}/analytics/organizer-insights`,
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-jwt-token');
    req.flush(mockResponse);
  });
});
