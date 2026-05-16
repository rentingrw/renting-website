import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { DismissDisputeDto } from '../disputes/dto/dismiss-dispute.dto';
import { ResolveDisputeDto } from '../disputes/dto/resolve-dispute.dto';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { CarsService } from '../cars/cars.service';
import { AdjustTrustScoreDto } from './dto/adjust-trust-score.dto';
import { AdminNoteDto } from './dto/admin-note.dto';
import { CancelBookingAdminDto } from './dto/cancel-booking-admin.dto';
import { ListBookingsQueryDto } from './dto/list-bookings.query.dto';
import { ListDisputesQueryDto } from './dto/list-disputes.query.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions.query.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { ListListingsQueryDto } from './dto/list-listings.query.dto';
import { RejectListingDto } from './dto/reject-listing.dto';
import { ListDriversQueryDto } from './dto/list-drivers.query.dto';
import { AdminCreateCarDto } from './dto/admin-create-car.dto';
import { AdminCreateDriverDto } from './dto/admin-create-driver.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AdminJwtGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
    private readonly carsService: CarsService,
  ) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get a high-level platform overview for the admin dashboard' })
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get detailed platform analytics and metrics' })
  getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('upload-url')
  @ApiOperation({ summary: 'Get a Cloudinary signed upload URL for admin image uploads' })
  getUploadUrl(@Query('folder') folder?: string) {
    return this.carsService.getSignedUploadUrl(folder ?? 'rentingi/admin');
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users with optional filters and pagination' })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get a user by ID with full detail' })
  getUserById(@Param('id') userId: string) {
    return this.adminService.getUserById(userId);
  }

  @Post('users/:id/trust-score-adjustments')
  @ApiOperation({ summary: 'Manually adjust the trust score for a user' })
  adjustTrustScore(@Param('id') userId: string, @Body() payload: AdjustTrustScoreDto) {
    return this.adminService.adjustUserTrustScore(userId, payload);
  }

  @Patch('users/:id/suspend')
  @ApiOperation({ summary: 'Suspend a user account' })
  suspendUser(@Param('id') userId: string, @Body() payload: AdminNoteDto) {
    return this.adminService.suspendUser(userId, payload);
  }

  @Patch('users/:id/reinstate')
  @ApiOperation({ summary: 'Reinstate a previously suspended user account' })
  reinstateUser(@Param('id') userId: string, @Body() payload: AdminNoteDto) {
    return this.adminService.reinstateUser(userId, payload);
  }

  @Patch('users/:id/verify-phone')
  @ApiOperation({ summary: 'Mark a user\'s phone number as verified' })
  verifyPhone(@Param('id') userId: string) {
    return this.adminService.verifyUserPhone(userId);
  }

  @Post('users/:id/verify-kyc')
  @ApiOperation({ summary: 'Approve KYC submission and mark user as verified' })
  verifyKyc(@Param('id') userId: string) {
    return this.usersService.adminVerifyUser(userId);
  }

  @Post('users/:id/grant-admin')
  @ApiOperation({ summary: 'Grant admin role to a user via Clerk publicMetadata' })
  grantAdminRole(@Param('id') userId: string) {
    return this.adminService.grantAdminRole(userId);
  }

  @Delete('users/:id/grant-admin')
  @ApiOperation({ summary: 'Revoke admin role from a user' })
  revokeAdminRole(@Param('id') userId: string) {
    return this.adminService.revokeAdminRole(userId);
  }

  @Get('listings')
  @ApiOperation({ summary: 'List car listings (defaults to pending_approval)' })
  listListings(@Query() query: ListListingsQueryDto) {
    return this.adminService.listListings(query);
  }

  @Patch('listings/:id/approve')
  @ApiOperation({ summary: 'Approve a pending car listing and make it active' })
  approveListing(@Param('id') listingId: string) {
    return this.adminService.approveListing(listingId);
  }

  @Post('listings/:id/reject')
  @ApiOperation({ summary: 'Reject a pending car listing with a reason' })
  rejectListing(@Param('id') listingId: string, @Body() payload: RejectListingDto) {
    return this.adminService.rejectListing(listingId, payload);
  }

  @Delete('listings/:id')
  @ApiOperation({ summary: 'Permanently delete a car listing' })
  deleteListing(@Param('id') listingId: string) {
    return this.adminService.deleteListing(listingId);
  }

  @Post('cars')
  @ApiOperation({ summary: 'Create a car listing on behalf of a user' })
  adminCreateCar(@Body() payload: AdminCreateCarDto) {
    return this.adminService.adminCreateCar(payload);
  }

  @Get('drivers')
  @ApiOperation({ summary: 'List all driver profiles' })
  listDrivers(@Query() query: ListDriversQueryDto) {
    return this.adminService.listDrivers(query);
  }

  @Delete('drivers/:id')
  @ApiOperation({ summary: 'Delete a driver profile' })
  deleteDriver(@Param('id') driverProfileId: string) {
    return this.adminService.deleteDriver(driverProfileId);
  }

  @Post('driver-profiles')
  @ApiOperation({ summary: 'Create a driver profile on behalf of a user' })
  adminCreateDriver(@Body() payload: AdminCreateDriverDto) {
    return this.adminService.adminCreateDriver(payload);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List all subscriptions with optional filters and pagination' })
  listSubscriptions(@Query() query: ListSubscriptionsQueryDto) {
    return this.adminService.listSubscriptions(query);
  }

  @Get('subscriptions/users/:userId/payments')
  @ApiOperation({ summary: 'Get subscription payment history for a specific owner' })
  paymentHistory(@Param('userId') userId: string) {
    return this.adminService.getSubscriptionPaymentHistoryForOwner(userId);
  }

  @Patch('subscriptions/:id/activate')
  @ApiOperation({ summary: 'Activate a subscription manually' })
  activateSubscription(@Param('id') subscriptionId: string, @Body() payload: AdminNoteDto) {
    return this.adminService.activateSubscription(subscriptionId, payload);
  }

  @Patch('subscriptions/:id/deactivate')
  @ApiOperation({ summary: 'Deactivate a subscription manually' })
  deactivateSubscription(@Param('id') subscriptionId: string, @Body() payload: AdminNoteDto) {
    return this.adminService.deactivateSubscription(subscriptionId, payload);
  }

  @Get('disputes')
  @ApiOperation({ summary: 'List all disputes with optional filters and pagination' })
  listDisputes(@Query() query: ListDisputesQueryDto) {
    return this.adminService.listDisputes(query);
  }

  @Get('disputes/:id')
  @ApiOperation({ summary: 'Get a dispute by ID with full detail' })
  getDisputeById(@Param('id') disputeId: string) {
    return this.adminService.getDisputeById(disputeId);
  }

  @Post('disputes/:id/resolve')
  @ApiOperation({ summary: 'Resolve an open dispute' })
  resolveDispute(
    @Param('id') disputeId: string,
    @Body() payload: ResolveDisputeDto,
  ) {
    return this.adminService.resolveDispute(disputeId, payload);
  }

  @Post('disputes/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss an open dispute without resolution' })
  dismissDispute(
    @Param('id') disputeId: string,
    @Body() payload: DismissDisputeDto,
  ) {
    return this.adminService.dismissDispute(disputeId, payload);
  }

  @Get('bookings')
  @ApiOperation({ summary: 'List all bookings (car and driver) with optional filters' })
  listBookings(@Query() query: ListBookingsQueryDto) {
    return this.adminService.listBookings(query);
  }

  @Get('bookings/:type/:id')
  @ApiOperation({ summary: 'Get detailed information for a specific booking' })
  getBookingDetail(@Param('type') type: 'car' | 'driver', @Param('id') bookingId: string) {
    return this.adminService.getBookingDetail(type, bookingId);
  }

  @Post('bookings/:type/:id/cancel')
  @ApiOperation({ summary: 'Cancel a booking as an admin' })
  cancelBooking(
    @Param('type') type: 'car' | 'driver',
    @Param('id') bookingId: string,
    @Body() payload: CancelBookingAdminDto,
  ) {
    return this.adminService.cancelBooking(type, bookingId, payload);
  }
}
