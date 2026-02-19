import { sparkeryDispatchService } from '../sparkeryDispatchService';

describe('sparkeryDispatchService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('creates a job with generated id', async () => {
    const job = await sparkeryDispatchService.createJob({
      title: 'Bond clean - Unit 12',
      serviceType: 'bond',
      priority: 2,
      scheduledDate: '2026-02-20',
      scheduledStartTime: '09:00',
      scheduledEndTime: '12:00',
    });

    expect(job.id).toBeTruthy();
    expect(job.status).toBe('pending');
  });

  it('lists jobs in week range', async () => {
    await sparkeryDispatchService.createJob({
      title: 'Inside week',
      serviceType: 'airbnb',
      priority: 3,
      scheduledDate: '2026-02-21',
      scheduledStartTime: '10:00',
      scheduledEndTime: '12:00',
    });
    await sparkeryDispatchService.createJob({
      title: 'Outside week',
      serviceType: 'regular',
      priority: 4,
      scheduledDate: '2026-03-01',
      scheduledStartTime: '10:00',
      scheduledEndTime: '12:00',
    });

    const jobs = await sparkeryDispatchService.getJobs({
      weekStart: '2026-02-16',
      weekEnd: '2026-02-22',
    });

    expect(jobs).toHaveLength(1);
    expect(jobs[0].title).toBe('Inside week');
  });

  it('assigns employee and sets status assigned', async () => {
    const employees = await sparkeryDispatchService.getEmployees();
    const created = await sparkeryDispatchService.createJob({
      title: 'Assign me',
      serviceType: 'bond',
      priority: 1,
      scheduledDate: '2026-02-20',
      scheduledStartTime: '08:00',
      scheduledEndTime: '10:00',
    });

    const updated = await sparkeryDispatchService.assignJob(
      created.id,
      employees[0].id
    );

    expect(updated.assignedEmployeeId).toBe(employees[0].id);
    expect(updated.status).toBe('assigned');
  });

  it('updates status and persists value', async () => {
    const created = await sparkeryDispatchService.createJob({
      title: 'Status update',
      serviceType: 'commercial',
      priority: 5,
      scheduledDate: '2026-02-20',
      scheduledStartTime: '13:00',
      scheduledEndTime: '15:00',
    });

    await sparkeryDispatchService.updateJobStatus(created.id, 'completed');
    const jobs = await sparkeryDispatchService.getJobs();

    expect(jobs.find(j => j.id === created.id)?.status).toBe('completed');
  });

  it('deletes job from collection', async () => {
    const created = await sparkeryDispatchService.createJob({
      title: 'Delete me',
      serviceType: 'regular',
      priority: 3,
      scheduledDate: '2026-02-20',
      scheduledStartTime: '09:00',
      scheduledEndTime: '10:00',
    });

    await sparkeryDispatchService.deleteJob(created.id);
    const jobs = await sparkeryDispatchService.getJobs();

    expect(jobs.find(j => j.id === created.id)).toBeUndefined();
  });
});
