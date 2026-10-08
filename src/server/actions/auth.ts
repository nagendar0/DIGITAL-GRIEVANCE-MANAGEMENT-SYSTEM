"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { isEmailVerifiedInDb } from "@/server/actions/otp";
import { verifyEmailSignature } from "@/lib/email/otp-crypto";

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpCitizenSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerOrgSchema = z.object({
  adminName: z.string().min(2, "Name must be at least 2 characters"),
  adminEmail: z.string().email("Invalid email address"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters"),
  adminPhone: z.string().min(5, "Phone must be at least 5 digits"),
  orgName: z.string().min(2, "Organization name must be at least 2 characters"),
  orgType: z.enum([
    "MUNICIPALITY",
    "PUBLIC_WORKS",
    "WATER_BOARD",
    "ELECTRICITY_BOARD",
    "TRANSPORT_AUTHORITY",
    "SANITATION",
    "OTHER",
  ]),
  registrationNumber: z.string().min(1, "Registration number is required"),
  officialEmail: z.string().email("Invalid official email"),
  officialPhone: z.string().min(5, "Official phone must be at least 5 digits"),
  address: z.string().min(3, "Full office address is required"),
  verificationDocUrl: z.string().optional().default("GOV-OFFICIAL-AFFILIATION-VERIFIED"),
});

export async function getExistingAuthUserByEmail(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const adminClient = createAdminClient();
  const { data: userList } = await adminClient.auth.admin.listUsers();
  return userList?.users?.find((u) => u.email?.toLowerCase() === cleanEmail) || null;
}

export type EmailDomainCheckResult = {
  email: string;
  exists: boolean;
  registeredInDomain: boolean;
  actualRole?: "CITIZEN" | "ORG_MEMBER" | "WORKER" | "PLATFORM_ADMIN";
  domainName: "Citizen" | "Organization" | "Field Worker";
  status: "ALREADY_REGISTERED" | "NOT_REGISTERED" | "DIFFERENT_ROLE" | "AVAILABLE";
  message: string;
};

export async function checkEmailDomainStatus(
  email: string,
  domain: "CITIZEN" | "ORGANIZATION" | "WORKER",
  mode: "SIGN_IN" | "SIGN_UP" = "SIGN_IN"
): Promise<EmailDomainCheckResult> {
  const cleanEmail = (email || "").trim().toLowerCase();
  const domainName =
    domain === "CITIZEN" ? "Citizen" : domain === "ORGANIZATION" ? "Organization" : "Field Worker";

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return {
      email: cleanEmail,
      exists: false,
      registeredInDomain: false,
      domainName,
      status: "NOT_REGISTERED",
      message: "Please enter a valid email address.",
    };
  }

  const adminClient = createAdminClient();
  const existingUser = await getExistingAuthUserByEmail(cleanEmail);

  // Check organizations official_email
  const { data: orgWithOfficialEmail } = await adminClient
    .from("organizations")
    .select("id")
    .ilike("official_email", cleanEmail)
    .maybeSingle();

  if (!existingUser && !orgWithOfficialEmail) {
    return {
      email: cleanEmail,
      exists: false,
      registeredInDomain: false,
      domainName,
      status: "NOT_REGISTERED",
      message:
        mode === "SIGN_IN"
          ? `No ${domainName} account found with this email. Please register or create an account.`
          : `Email available for new ${domainName} registration.`,
    };
  }

  // User exists: determine actual role
  let actualRole: "CITIZEN" | "ORG_MEMBER" | "WORKER" | "PLATFORM_ADMIN" = "CITIZEN";

  if (existingUser) {
    const { data: worker } = await adminClient
      .from("workers")
      .select("id")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    const { data: member } = await adminClient
      .from("organization_members")
      .select("id")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", existingUser.id)
      .maybeSingle();

    if (
      profile?.role === "PLATFORM_ADMIN" ||
      existingUser.user_metadata?.role === "PLATFORM_ADMIN"
    ) {
      actualRole = "PLATFORM_ADMIN";
    } else if (worker) {
      actualRole = "WORKER";
    } else if (member || orgWithOfficialEmail) {
      actualRole = "ORG_MEMBER";
    } else {
      actualRole = "CITIZEN";
    }
  } else if (orgWithOfficialEmail) {
    actualRole = "ORG_MEMBER";
  }

  if (domain === "CITIZEN") {
    // Every registered user in ResolveAI has citizen privileges
    if (mode === "SIGN_IN") {
      return {
        email: cleanEmail,
        exists: true,
        registeredInDomain: true,
        actualRole,
        domainName,
        status: "ALREADY_REGISTERED",
        message: "Citizen account found. Enter your password to sign in.",
      };
    }
    // In SIGN_UP mode:
    if (actualRole === "CITIZEN") {
      return {
        email: cleanEmail,
        exists: true,
        registeredInDomain: true,
        actualRole,
        domainName,
        status: "ALREADY_REGISTERED",
        message: "Already registered. An account with this email is already registered as a Citizen. Please log in.",
      };
    }
    // Existing account from another role (worker/org) enrolling as citizen
    return {
      email: cleanEmail,
      exists: true,
      registeredInDomain: false,
      actualRole,
      domainName,
      status: "AVAILABLE",
      message: "Existing account found. You can enroll as a Citizen with this email.",
    };
  }

  if (domain === "ORGANIZATION") {
    if (mode === "SIGN_IN") {
      return {
        email: cleanEmail,
        exists: true,
        registeredInDomain: true,
        actualRole,
        domainName,
        status: "ALREADY_REGISTERED",
        message: "Organization account found. Enter your password to sign in.",
      };
    }
    if (actualRole === "ORG_MEMBER") {
      return {
        email: cleanEmail,
        exists: true,
        registeredInDomain: true,
        actualRole,
        domainName,
        status: "ALREADY_REGISTERED",
        message:
          "Already registered. An account with this email is already enrolled in an Organization. Please log in.",
      };
    }
    return {
      email: cleanEmail,
      exists: true,
      registeredInDomain: false,
      actualRole,
      domainName,
      status: "AVAILABLE",
      message: "You can register your Organization with this email.",
    };
  }

  // domain === "WORKER"
  if (mode === "SIGN_IN") {
    return {
      email: cleanEmail,
      exists: true,
      registeredInDomain: true,
      actualRole,
      domainName,
      status: "ALREADY_REGISTERED",
      message: "Field Worker account found. Enter your password to sign in.",
    };
  }
  if (actualRole === "WORKER") {
    return {
      email: cleanEmail,
      exists: true,
      registeredInDomain: true,
      actualRole,
      domainName,
      status: "ALREADY_REGISTERED",
      message:
        "Already registered. An account with this email is already registered as a Field Worker. Please log in.",
    };
  }
  return {
    email: cleanEmail,
    exists: true,
    registeredInDomain: false,
    actualRole,
    domainName,
    status: "AVAILABLE",
    message: "You can register as a Field Worker with this email.",
  };
}

export async function signIn(prevState: any, formData: FormData) {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const validated = signInSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const cleanEmail = validated.data.email.trim().toLowerCase();
  const intendedRole = (formData.get("intendedRole") || formData.get("role")) as string | null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: validated.data.password,
  });

  if (error || !data.user) {
    const existingUser = await getExistingAuthUserByEmail(cleanEmail);
    if (!existingUser) {
      if (intendedRole === "ORGANIZATION") {
        return {
          error: "Email not registered. No organization account found for this email address. Please register your organization first.",
        };
      }
      if (intendedRole === "WORKER") {
        return {
          error: "Email not registered. No field worker account found for this email address. Please register as a field technician first.",
        };
      }
      return {
        error: "Email not registered. No citizen account found for this email address. Please create a citizen account first.",
      };
    }
    return { error: "Incorrect password. Please verify your credentials and try again." };
  }

  const adminClient = createAdminClient();

  // 1. Check if user is an existing registered worker
  const { data: worker } = await adminClient
    .from("workers")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  // 2. Check if user is an existing organization member
  const { data: member } = await adminClient
    .from("organization_members")
    .select("id, organization_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  // 3. Check profiles table and user_metadata
  const { data: profile } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();

  const isPlatformAdmin =
    profile?.role === "PLATFORM_ADMIN" || data.user.user_metadata?.role === "PLATFORM_ADMIN";

  const resolvedFullName =
    data.user.user_metadata?.full_name ||
    profile?.full_name ||
    cleanEmail.split("@")[0] ||
    "User";
  const resolvedPhone = data.user.user_metadata?.phone || profile?.phone || null;

  let role: string = "CITIZEN";

  if (intendedRole === "ORGANIZATION") {
    if (isPlatformAdmin) {
      role = "PLATFORM_ADMIN";
    } else {
      role = "ORG_MEMBER";
      // Ensure profile exists in profiles table
      if (!profile) {
        await adminClient.from("profiles").insert({
          id: data.user.id,
          full_name: resolvedFullName,
          phone: resolvedPhone,
          role: "ORG_MEMBER",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Check organization database table (organization_members)
      if (!member) {
        // Not found in organization_members: create account in organization_members!
        const { data: matchedOrg } = await adminClient
          .from("organizations")
          .select("id")
          .ilike("official_email", cleanEmail)
          .maybeSingle();

        let targetOrgId = matchedOrg?.id;

        if (!targetOrgId) {
          const { data: defaultOrg } = await adminClient
            .from("organizations")
            .select("id")
            .limit(1)
            .maybeSingle();

          if (defaultOrg) {
            targetOrgId = defaultOrg.id;
          } else {
            const { data: newOrg } = await adminClient
              .from("organizations")
              .insert({
                name: "Municipal Works & Civic Services",
                type: "MUNICIPALITY",
                registration_number: `GOV-${Date.now().toString().slice(-6)}`,
                official_email: cleanEmail,
                official_phone: resolvedPhone || "+91 98765 00000",
                address: "Civic Centre, Municipal Complex",
                verification_doc_url: "https://resolveai.gov.in/docs/municipal_charter.pdf",
                status: "VERIFIED",
              })
              .select("id")
              .single();
            targetOrgId = newOrg?.id;
          }
        }

        if (targetOrgId) {
          await adminClient.from("organization_members").upsert(
            {
              organization_id: targetOrgId,
              user_id: data.user.id,
              is_admin: true,
            },
            { onConflict: "organization_id,user_id" }
          );
        }
      }
    }
  } else if (intendedRole === "WORKER") {
    if (isPlatformAdmin) {
      role = "PLATFORM_ADMIN";
    } else {
      role = "WORKER";
      // Ensure profile exists in profiles table
      if (!profile) {
        await adminClient.from("profiles").insert({
          id: data.user.id,
          full_name: resolvedFullName,
          phone: resolvedPhone,
          role: "WORKER",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Check worker database table (workers)
      if (!worker) {
        // Not found in workers table: create account in workers table!
        const { data: defaultOrg } = await adminClient
          .from("organizations")
          .select("id")
          .limit(1)
          .maybeSingle();

        let targetOrgId = defaultOrg?.id;
        if (!targetOrgId) {
          const { data: newOrg } = await adminClient
            .from("organizations")
            .insert({
              name: "Municipal Works & Civic Services",
              type: "MUNICIPALITY",
              registration_number: `GOV-${Date.now().toString().slice(-6)}`,
              official_email: "support@resolveai.gov.in",
              official_phone: "+91 98765 00000",
              address: "Civic Centre, Municipal Complex",
              verification_doc_url: "https://resolveai.gov.in/docs/municipal_charter.pdf",
              status: "VERIFIED",
            })
            .select("id")
            .single();
          targetOrgId = newOrg?.id;
        }

        await adminClient.from("workers").insert({
          user_id: data.user.id,
          organization_id: targetOrgId,
          skills: ["General Municipal Maintenance", "Civic Repairs"],
          is_active: true,
          current_active_jobs: 0,
        });
      }
    }
  } else {
    // Intended role is CITIZEN (or default)
    if (isPlatformAdmin) {
      role = "PLATFORM_ADMIN";
    } else {
      role = "CITIZEN";
      // Check citizen database table (profiles)
      if (!profile) {
        // Not found in profiles: create account in profiles table!
        await adminClient.from("profiles").insert({
          id: data.user.id,
          full_name: resolvedFullName,
          phone: resolvedPhone,
          role: "CITIZEN",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  // Ensure profiles table has the resolved role
  await adminClient.from("profiles").upsert({
    id: data.user.id,
    full_name: resolvedFullName,
    phone: resolvedPhone,
    role: role as any,
    updated_at: new Date().toISOString(),
  });

  // Ensure Supabase Auth user metadata has the verified role for middleware checks
  await adminClient.auth.admin.updateUserById(data.user.id, {
    user_metadata: {
      ...(data.user.user_metadata || {}),
      role: role,
    },
  });

  if (role === "PLATFORM_ADMIN") {
    redirect("/admin");
  } else if (role === "ORG_MEMBER") {
    redirect("/org");
  } else if (role === "WORKER") {
    redirect("/worker");
  } else {
    redirect("/citizen");
  }
}

export async function signUpCitizen(prevState: any, formData: FormData) {
  const rawData = {
    fullName: formData.get("fullName") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    password: formData.get("password") as string,
  };

  const validated = signUpCitizenSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const cleanEmail = validated.data.email.trim().toLowerCase();
  const existingUser = await getExistingAuthUserByEmail(cleanEmail);
  const adminClient = createAdminClient();
  const supabase = await createClient();

  if (existingUser) {
    // Check if user is already registered purely as Citizen
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", existingUser.id)
      .maybeSingle();

    const { data: isWorker } = await adminClient
      .from("workers")
      .select("id")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    const { data: isOrg } = await adminClient
      .from("organization_members")
      .select("id")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    if (existingProfile?.role === "CITIZEN" && !isWorker && !isOrg) {
      return {
        error: "Already registered. An account with this email address is already registered as a Citizen. Please log in.",
      };
    }

    // User is enrolling as Citizen (e.g. from Worker or Organization)
    await adminClient.from("profiles").upsert({
      id: existingUser.id,
      full_name: validated.data.fullName,
      phone: validated.data.phone || null,
      role: "CITIZEN",
      updated_at: new Date().toISOString(),
    });

    await adminClient.auth.admin.updateUserById(existingUser.id, {
      password: validated.data.password,
      user_metadata: {
        ...existingUser.user_metadata,
        full_name: validated.data.fullName,
        phone: validated.data.phone || null,
        role: "CITIZEN",
      },
    });

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: validated.data.password,
    });

    if (signInErr) {
      return { error: "Citizen enrollment succeeded, but sign in failed. Please log in." };
    }

    redirect("/citizen");
  }

  // 1. Create confirmed citizen auth account using admin client
  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: cleanEmail,
    password: validated.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: validated.data.fullName,
      phone: validated.data.phone || null,
      role: "CITIZEN",
    },
  });

  if (createError || !newUser?.user) {
    return { error: createError?.message || "Failed to create citizen account." };
  }

  const userId = newUser.user.id;

  // 2. Ensure profile record is inserted with CITIZEN role
  await adminClient.from("profiles").upsert({
    id: userId,
    full_name: validated.data.fullName,
    phone: validated.data.phone || null,
    role: "CITIZEN",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // 3. Automatically sign in the new citizen
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: validated.data.password,
  });

  if (signInError) {
    return { error: "Registration succeeded, but auto-sign in failed. Please log in." };
  }

  redirect("/citizen");
}

export async function registerOrganization(prevState: any, formData: FormData) {
  const rawData = {
    adminName: formData.get("adminName") as string,
    adminEmail: formData.get("adminEmail") as string,
    adminPassword: formData.get("adminPassword") as string,
    adminPhone: formData.get("adminPhone") as string,
    orgName: formData.get("orgName") as string,
    orgType: formData.get("orgType") as any,
    registrationNumber: formData.get("registrationNumber") as string,
    officialEmail: formData.get("officialEmail") as string,
    officialPhone: formData.get("officialPhone") as string,
    address: formData.get("address") as string,
    verificationDocUrl: formData.get("verificationDocUrl") as string || "uploaded-doc-placeholder.pdf",
  };

  const validated = registerOrgSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  // Enforce OTP verification for both Official Admin Email and Department Official Email
  const adminEmailToken = formData.get("adminEmailVerificationToken") as string | null;
  const officialEmailToken = formData.get("officialEmailVerificationToken") as string | null;

  const isAdminVerified =
    (await isEmailVerifiedInDb(validated.data.adminEmail)) ||
    (adminEmailToken && verifyEmailSignature(adminEmailToken, validated.data.adminEmail));

  if (!isAdminVerified) {
    return {
      error: "Please verify the Official Authority Administrator Email with the 6-digit OTP code before submitting.",
    };
  }

  const isOfficialVerified =
    (await isEmailVerifiedInDb(validated.data.officialEmail)) ||
    (officialEmailToken && verifyEmailSignature(officialEmailToken, validated.data.officialEmail));

  if (!isOfficialVerified) {
    return {
      error: "Please verify the Department Official Email with the 6-digit OTP code before submitting.",
    };
  }

  const cleanAdminEmail = validated.data.adminEmail.trim().toLowerCase();
  const adminClient = createAdminClient();
  const existingUser = await getExistingAuthUserByEmail(cleanAdminEmail);

  // Check if organization registration number already exists
  const { data: existingReg } = await adminClient
    .from("organizations")
    .select("id")
    .eq("registration_number", validated.data.registrationNumber.trim())
    .maybeSingle();

  if (existingReg) {
    return {
      error: "An organization with this registration number is already registered in the system.",
    };
  }

  let adminAuthId: string;

  if (existingUser) {
    const { data: existingMember } = await adminClient
      .from("organization_members")
      .select("id")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    if (existingMember) {
      return {
        error: "Already registered. An account with this email address is already registered as an Organization. Please log in.",
      };
    }

    adminAuthId = existingUser.id;

    // Update existing user credentials and metadata to ORG_MEMBER
    await adminClient.auth.admin.updateUserById(adminAuthId, {
      password: validated.data.adminPassword,
      user_metadata: {
        ...existingUser.user_metadata,
        full_name: validated.data.adminName,
        phone: validated.data.adminPhone,
        role: "ORG_MEMBER",
      },
    });
  } else {
    // 1. Create confirmed organization admin user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: cleanAdminEmail,
      password: validated.data.adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: validated.data.adminName,
        phone: validated.data.adminPhone,
        role: "ORG_MEMBER",
      },
    });

    if (createError || !newUser?.user) {
      return { error: createError?.message || "Failed to create authority account." };
    }

    adminAuthId = newUser.user.id;
  }

  // 2. Insert profile as ORG_MEMBER
  await adminClient.from("profiles").upsert({
    id: adminAuthId,
    full_name: validated.data.adminName,
    phone: validated.data.adminPhone,
    role: "ORG_MEMBER",
  });

  // 3. Insert organization in PENDING_VERIFICATION state
  const { data: orgData, error: orgError } = await adminClient
    .from("organizations")
    .insert({
      name: validated.data.orgName,
      type: validated.data.orgType,
      registration_number: validated.data.registrationNumber,
      official_email: validated.data.officialEmail,
      official_phone: validated.data.officialPhone,
      address: validated.data.address,
      verification_doc_url: validated.data.verificationDocUrl,
      status: "PENDING_VERIFICATION",
    })
    .select("id")
    .single();

  if (orgError || !orgData) {
    return { error: orgError?.message || "Failed to create organization record" };
  }

  // 4. Link member to organization as administrator
  await adminClient.from("organization_members").upsert(
    {
      organization_id: orgData.id,
      user_id: adminAuthId,
      is_admin: true,
    },
    { onConflict: "organization_id,user_id" }
  );

  // Synchronize auth user_metadata role for instant routing
  await adminClient.auth.admin.updateUserById(adminAuthId, {
    user_metadata: {
      full_name: validated.data.adminName,
      phone: validated.data.adminPhone,
      role: "ORG_MEMBER",
    },
  });

  // 5. Automatically sign in the organization administrator
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({
    email: validated.data.adminEmail,
    password: validated.data.adminPassword,
  });

  redirect("/org");
}

const signUpWorkerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  skill: z.string().optional(),
});

export async function signUpWorker(prevState: any, formData: FormData) {
  const rawData = {
    fullName: formData.get("fullName") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    password: formData.get("password") as string,
    skill: (formData.get("skill") as string) || "General Municipal Maintenance",
  };

  const validated = signUpWorkerSchema.safeParse(rawData);
  if (!validated.success) {
    return { error: validated.error.errors[0].message };
  }

  const cleanEmail = validated.data.email.trim().toLowerCase();
  const adminClient = createAdminClient();
  const existingUser = await getExistingAuthUserByEmail(cleanEmail);

  let workerAuthId: string;

  if (existingUser) {
    const { data: existingWorker } = await adminClient
      .from("workers")
      .select("id")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    if (existingWorker) {
      return {
        error: "Already registered. An account with this email address is already registered as a Field Worker. Please log in.",
      };
    }

    // User already exists in auth (e.g. as Citizen), now enrolling as a Field Worker
    workerAuthId = existingUser.id;

    // Update their password and user metadata
    await adminClient.auth.admin.updateUserById(workerAuthId, {
      password: validated.data.password,
      user_metadata: {
        ...existingUser.user_metadata,
        full_name: validated.data.fullName,
        phone: validated.data.phone,
        role: "WORKER",
      },
    });
  } else {
    // 1. Create new auth user with role WORKER
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: validated.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: validated.data.fullName,
        phone: validated.data.phone,
        role: "WORKER",
      },
    });

    if (createError || !newUser?.user) {
      return { error: createError?.message || "Failed to create worker account." };
    }

    workerAuthId = newUser.user.id;
  }

  const supabase = await createClient();

  // 2. Ensure Profile exists with WORKER role
  await adminClient.from("profiles").upsert({
    id: workerAuthId,
    full_name: validated.data.fullName,
    phone: validated.data.phone,
    role: "WORKER",
    updated_at: new Date().toISOString(),
  });

  // 3. Find or ensure primary organization
  const { data: existingOrg } = await adminClient
    .from("organizations")
    .select("id")
    .limit(1)
    .single();

  let orgId = existingOrg?.id;
  if (!orgId) {
    const { data: newOrg } = await adminClient
      .from("organizations")
      .insert({
        name: "Municipal Works & Civic Services",
        type: "MUNICIPALITY",
        registration_number: "GOV-MUNICIPAL-CIVIC-01",
        official_email: "municipal-services@gov.local",
        official_phone: "+91 99999 88888",
        address: "Municipal Corporation Complex, City Center",
        status: "VERIFIED",
      })
      .select("id")
      .single();
    orgId = newOrg?.id;
  }

  if (orgId) {
    await adminClient.from("workers").upsert({
      user_id: workerAuthId,
      organization_id: orgId,
      skills: [validated.data.skill || "General Municipal Maintenance"],
      is_active: true,
      current_active_jobs: 0,
    }, { onConflict: "user_id" });
  }

  // Synchronize auth user_metadata role for instant routing
  await adminClient.auth.admin.updateUserById(workerAuthId, {
    user_metadata: {
      full_name: validated.data.fullName,
      phone: validated.data.phone,
      role: "WORKER",
    },
  });

  // 4. Automatically sign in the new field worker
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: validated.data.password,
  });

  if (signInError) {
    redirect("/login");
  }

  redirect("/worker");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
