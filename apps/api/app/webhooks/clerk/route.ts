import type {
  DeletedObjectJSON,
  OrganizationJSON,
  OrganizationMembershipJSON,
  UserJSON,
  WebhookEvent,
} from "@clerk/nextjs/server";
import { log } from "@logtail/next";
import { RedisCacheRepository } from "@repo/database/repositories/redis-cache-repository";
import { UserCacheKeys } from "@repo/database/cache-keys/user-cache-keys";
import { BillableCostCacheKeys } from "@repo/database/cache-keys/billable-cost-cache-keys";
import { PrismaBillableCostExpensesRepository } from "@repo/database/repositories/prisma-billable-cost-expenses";
import { PrismaUserRepository } from "@repo/database/repositories/prisma-user";
import { analytics } from "@repo/design-system/lib/analytics/server";
import { headers } from "next/headers";
import { Webhook } from "svix";

const handleUserCreated = async (data: UserJSON) => {
  const billableExpensesRepository = new PrismaBillableCostExpensesRepository();
  const usersRepository = new PrismaUserRepository();
  const cacheRepository = new RedisCacheRepository();

  await usersRepository.create({
    id: data.id,
    email: data.email_addresses.at(0)?.email_address,
    name: data.first_name + " " + data.last_name,
    avatar: data.image_url,
    plan: "free",
  });

  await cacheRepository.set(
    UserCacheKeys.user(data.id),
    JSON.stringify({
      id: data.id,
      email: data.email_addresses.at(0)?.email_address,
      name: data.first_name + " " + data.last_name,
      avatar: data.image_url,
      plan: "free",
    })
  );

  // Calculate default billable hours
  const defaultWorkDays = 5;
  const defaultHoursPerDay = 6;
  const defaultHolidaysDays = 12;
  const defaultVacationsDays = 30;
  const defaultSickLeaveDays = 3;
  const defaultTimeOff = defaultHolidaysDays + defaultVacationsDays + defaultSickLeaveDays;
  const defaultWorkDaysPerYear = defaultWorkDays * 52;
  const defaultActualWorkDays = defaultWorkDaysPerYear - defaultTimeOff;
  const defaultBillableHours = defaultActualWorkDays * defaultHoursPerDay;

  await billableExpensesRepository.create({
    userId: data.id,
    workDays: defaultWorkDays,
    holidaysDays: defaultHolidaysDays,
    vacationsDays: defaultVacationsDays,
    sickLeaveDays: defaultSickLeaveDays,
    billableHours: defaultBillableHours,
    hoursPerDay: defaultHoursPerDay,
    monthlySalary: 0,
    taxes: 0,
    fees: 0,
    margin: 0,
  });

  await cacheRepository.set(
    BillableCostCacheKeys.billableCost(data.id),
    JSON.stringify({
      userId: data.id,
      workDays: defaultWorkDays,
      holidaysDays: defaultHolidaysDays,
      vacationsDays: defaultVacationsDays,
      sickLeaveDays: defaultSickLeaveDays,
      billableHours: defaultBillableHours,
      hoursPerDay: defaultHoursPerDay,
      monthlySalary: 0,
      taxes: 0,
      fees: 0,
      margin: 0,
    })
  );

  analytics.identify({
    distinctId: data.id,
    properties: {
      email: data.email_addresses.at(0)?.email_address,
      firstName: data.first_name,
      lastName: data.last_name,
      createdAt: new Date(data.created_at),
      avatar: data.image_url,
      phoneNumber: data.phone_numbers.at(0)?.phone_number,
    },
  });

  analytics.capture({
    event: "User Created",
    distinctId: data.id,
  });

  return new Response("User created", { status: 201 });
};

const handleUserUpdated = async (data: UserJSON) => {
  const usersRepository = new PrismaUserRepository();

  usersRepository.update(data.id, {
    email: data.email_addresses.at(0)?.email_address,
    name: data.first_name + " " + data.last_name,
    avatar: data.image_url,
  });

  const cacheRepository = new RedisCacheRepository();

  await cacheRepository.delete(UserCacheKeys.user(data.id));

  await cacheRepository.set(
    UserCacheKeys.user(data.id),
    JSON.stringify({
      id: data.id,
      email: data.email_addresses.at(0)?.email_address,
      name: data.first_name + " " + data.last_name,
      avatar: data.image_url,
      plan: "free",
    })
  );

  analytics.identify({
    distinctId: data.id,
    properties: {
      email: data.email_addresses.at(0)?.email_address,
      firstName: data.first_name,
      lastName: data.last_name,
      createdAt: new Date(data.created_at),
      avatar: data.image_url,
      phoneNumber: data.phone_numbers.at(0)?.phone_number,
    },
  });

  analytics.capture({
    event: "User Updated",
    distinctId: data.id,
  });

  return new Response("User updated", { status: 201 });
};

const handleUserDeleted = async (data: DeletedObjectJSON) => {
  const usersRepository = new PrismaUserRepository();
  const cacheRepository = new RedisCacheRepository();

  if (data.id) {
    usersRepository.delete(data.id);

    await cacheRepository.delete(UserCacheKeys.user(data.id));

    analytics.identify({
      distinctId: data.id,
      properties: {
        deleted: new Date(),
      },
    });

    analytics.capture({
      event: "User Deleted",
      distinctId: data.id,
    });
  }

  return new Response("User deleted", { status: 201 });
};

const handleOrganizationCreated = (data: OrganizationJSON) => {
  analytics.groupIdentify({
    groupKey: data.id,
    groupType: "company",
    distinctId: data.created_by,
    properties: {
      name: data.name,
      avatar: data.image_url,
    },
  });

  analytics.capture({
    event: "Organization Created",
    distinctId: data.created_by,
  });

  return new Response("Organization created", { status: 201 });
};

const handleOrganizationUpdated = (data: OrganizationJSON) => {
  analytics.groupIdentify({
    groupKey: data.id,
    groupType: "company",
    distinctId: data.created_by,
    properties: {
      name: data.name,
      avatar: data.image_url,
    },
  });

  analytics.capture({
    event: "Organization Updated",
    distinctId: data.created_by,
  });

  return new Response("Organization updated", { status: 201 });
};

const handleOrganizationMembershipCreated = (
  data: OrganizationMembershipJSON
) => {
  analytics.groupIdentify({
    groupKey: data.organization.id,
    groupType: "company",
    distinctId: data.public_user_data.user_id,
  });

  analytics.capture({
    event: "Organization Member Created",
    distinctId: data.public_user_data.user_id,
  });

  return new Response("Organization membership created", { status: 201 });
};

const handleOrganizationMembershipDeleted = (
  data: OrganizationMembershipJSON
) => {
  // Need to unlink the user from the group

  analytics.capture({
    event: "Organization Member Deleted",
    distinctId: data.public_user_data.user_id,
  });

  return new Response("Organization membership deleted", { status: 201 });
};

export const POST = async (request: Request): Promise<Response> => {
  if (!process.env.CLERK_WEBHOOK_SECRET) {
    throw new Error(
      "Please add process.env.CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local"
    );
  }

  // Get the headers
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Error occured -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = (await request.json()) as object;
  const body = JSON.stringify(payload);

  // Create a new SVIX instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

  // eslint-disable-next-line no-undef-init
  let event: WebhookEvent | undefined;

  // Verify the payload with the headers
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (error) {
    log.error("Error verifying webhook:", { error });
    return new Response("Error occurred", {
      status: 400,
    });
  }

  // Get the ID and type
  const { id } = event.data;
  const eventType = event.type;

  log.info("Webhook", { id, eventType, body });

  let response: Response = new Response("", { status: 201 });

  switch (eventType) {
    case "user.created": {
      console.log("Received user.created event for:", event.data.id); // Debug log

      response = await handleUserCreated(event.data);
      break;
    }
    case "user.updated": {
      response = await handleUserUpdated(event.data);
      break;
    }
    case "user.deleted": {
      response = await handleUserDeleted(event.data);
      break;
    }
    // case "organization.created": {
    //   response = handleOrganizationCreated(event.data);
    //   break;
    // }
    // case "organization.updated": {
    //   response = handleOrganizationUpdated(event.data);
    //   break;
    // }
    // case "organizationMembership.created": {
    //   response = handleOrganizationMembershipCreated(event.data);
    //   break;
    // }
    // case "organizationMembership.deleted": {
    //   response = handleOrganizationMembershipDeleted(event.data);
    //   break;
    // }
    default: {
      break;
    }
  }

  await analytics.shutdown();

  return response;
};
