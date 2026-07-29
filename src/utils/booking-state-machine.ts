import { BookingStatus } from '@prisma/client';

export class BookingStateMachine {
  private static allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
    [BookingStatus.PENDING]: [BookingStatus.ACCEPTED, BookingStatus.REJECTED, BookingStatus.CANCELLED],
    [BookingStatus.ACCEPTED]: [BookingStatus.DRIVER_ARRIVING, BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
    [BookingStatus.DRIVER_ARRIVING]: [BookingStatus.ARRIVED],
    [BookingStatus.ARRIVED]: [BookingStatus.IN_PROGRESS],
    [BookingStatus.IN_PROGRESS]: [BookingStatus.COMPLETED],
    [BookingStatus.COMPLETED]: [],
    [BookingStatus.REJECTED]: [],
    [BookingStatus.CANCELLED]: [],
  };

  /**
   * Checks if a transition from currentStatus to nextStatus is allowed.
   */
  static isTransitionAllowed(currentStatus: BookingStatus, nextStatus: BookingStatus): boolean {
    const allowed = this.allowedTransitions[currentStatus];
    return allowed ? allowed.includes(nextStatus) : false;
  }

  /**
   * Validates if a transition is allowed, throwing an error if not.
   */
  static validateTransition(currentStatus: BookingStatus, nextStatus: BookingStatus): void {
    if (!this.isTransitionAllowed(currentStatus, nextStatus)) {
      const error: any = new Error(`Cannot transition booking from ${currentStatus} to ${nextStatus}`);
      error.statusCode = 400;
      throw error;
    }
  }

  /**
   * Checks if a status is a terminal state.
   */
  static isTerminal(status: BookingStatus): boolean {
    return this.allowedTransitions[status].length === 0;
  }
}
