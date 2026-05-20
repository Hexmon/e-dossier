"use client";

import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { IndiaPhoneInput } from "@/components/ui/india-phone-input";
import { Input } from "@/components/ui/input";
import type { OCRecord, OCPersonalProfile } from "@/app/lib/api/ocApi";
import { Alert, AlertDescription } from "../ui/alert";
import SearchableSelect from "@/components/ui/searchable-select";

interface OCFormProps {
    onSubmit: (data: Partial<OCRecord>) => Promise<void>;
    onCancel: () => void;
    defaultValues?: Partial<OCRecord>;
    courses: Array<{ id: string; code?: string; title?: string }>;
    platoons: Array<{ id: string; key?: string; name?: string }>;
    isEditing: boolean;
}

export const OC_FORM_DIALOG_CONTENT_CLASS =
    "w-[96vw] sm:!max-w-[96vw] lg:!max-w-[1280px] xl:!max-w-[1500px] max-h-[92vh] overflow-hidden p-0 flex flex-col";

export const OC_FORM_BODY_CLASS =
    "min-h-0 flex-1 overflow-y-auto bg-muted/20 px-6 py-5";

export const OC_FORM_SECTION_GRID_CLASS =
    "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3";

type SwimmerValue = "" | "true" | "false";

interface OCFormData {
    name: string;
    ocNo: string;
    jnuEnrollmentNo?: string;
    courseId: string;
    branch?: string;
    platoonId?: string;
    arrivalAtUniversity?: string;
    visibleIdentMarks?: string;
    pi?: string;
    dob?: string;
    placeOfBirth?: string;
    domicile?: string;
    religion?: string;
    nationality?: string;
    bloodGroup?: string;
    identMarks?: string;
    mobileNo?: string;
    email?: string;
    passportNo?: string;
    panNo?: string;
    aadhaarNo?: string;
    fatherName?: string;
    fatherMobile?: string;
    fatherAddrPerm?: string;
    fatherAddrPresent?: string;
    fatherProfession?: string;
    guardianName?: string;
    guardianAddress?: string;
    monthlyIncome?: string;
    nokDetails?: string;
    nokAddrPerm?: string;
    nokAddrPresent?: string;
    nearestRailwayStation?: string;
    familyInSecunderabad?: string;
    relativeInArmedForces?: string;
    govtFinancialAssistance?: boolean;
    bankDetails?: string;
    idenCardNo?: string;
    upscRollNo?: string;
    ssbCentre?: string;
    games?: string;
    hobbies?: string;
    swimmer?: SwimmerValue;
    languages?: string;
}

function textValue(value: unknown): string {
    return value == null ? "" : String(value);
}

function dateValue(value: unknown): string {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(String(value));
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
}

function nullableText(value: string | undefined): string | null {
    const next = value?.trim() ?? "";
    return next ? next : null;
}

function nullableNumber(value: string | undefined): number | null {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
}

function fieldContainerClass(wide = false): string {
    return wide ? "space-y-1 md:col-span-2 xl:col-span-3" : "space-y-1";
}

function FormSection({
    id,
    title,
    description,
    children,
}: {
    id: string;
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section id={id} className="rounded-md border bg-background p-4 shadow-sm scroll-mt-6">
            <div className="mb-4 flex flex-col gap-1 border-b pb-3">
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
            </div>
            <div className={OC_FORM_SECTION_GRID_CLASS}>{children}</div>
        </section>
    );
}

function FieldShell({
    label,
    error,
    htmlFor,
    wide,
    children,
}: {
    label: string;
    error: string | null;
    htmlFor?: string;
    wide?: boolean;
    children: ReactNode;
}) {
    return (
        <div className={fieldContainerClass(wide)}>
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
    );
}

export function OCForm({
    onSubmit,
    onCancel,
    defaultValues = {},
    courses,
    platoons,
    isEditing,
}: OCFormProps) {
    const personal = (defaultValues.personal ?? {}) as OCPersonalProfile;
    const formDefaults: Partial<OCFormData> = {
        name: defaultValues.name || "",
        ocNo: defaultValues.ocNo || "",
        jnuEnrollmentNo: defaultValues.jnuEnrollmentNo ? String(defaultValues.jnuEnrollmentNo) : "",
        courseId: defaultValues.courseId ?? defaultValues.course?.id ?? "",
        branch: defaultValues.branch || "",
        platoonId: defaultValues.platoonId || defaultValues.platoon?.id || "",
        arrivalAtUniversity: dateValue(defaultValues.arrivalAtUniversity),
        visibleIdentMarks: textValue(personal.visibleIdentMarks),
        pi: textValue(personal.pi),
        dob: dateValue(personal.dob),
        placeOfBirth: textValue(personal.placeOfBirth),
        domicile: textValue(personal.domicile),
        religion: textValue(personal.religion),
        nationality: textValue(personal.nationality),
        bloodGroup: textValue(personal.bloodGroup),
        identMarks: textValue(personal.identMarks),
        mobileNo: textValue(personal.mobileNo),
        email: textValue(personal.email),
        passportNo: textValue(personal.passportNo),
        panNo: textValue(personal.panNo),
        aadhaarNo: textValue(personal.aadhaarNo),
        fatherName: textValue(personal.fatherName),
        fatherMobile: textValue(personal.fatherMobile),
        fatherAddrPerm: textValue(personal.fatherAddrPerm),
        fatherAddrPresent: textValue(personal.fatherAddrPresent),
        fatherProfession: textValue(personal.fatherProfession),
        guardianName: textValue(personal.guardianName),
        guardianAddress: textValue(personal.guardianAddress),
        monthlyIncome: textValue(personal.monthlyIncome),
        nokDetails: textValue(personal.nokDetails),
        nokAddrPerm: textValue(personal.nokAddrPerm),
        nokAddrPresent: textValue(personal.nokAddrPresent),
        nearestRailwayStation: textValue(personal.nearestRailwayStation),
        familyInSecunderabad: textValue(personal.familyInSecunderabad),
        relativeInArmedForces: textValue(personal.relativeInArmedForces),
        govtFinancialAssistance: Boolean(personal.govtFinancialAssistance),
        bankDetails: textValue(personal.bankDetails),
        idenCardNo: textValue(personal.idenCardNo),
        upscRollNo: textValue(personal.upscRollNo),
        ssbCentre: textValue(personal.ssbCentre),
        games: textValue(personal.games),
        hobbies: textValue(personal.hobbies),
        swimmer: personal.swimmer == null ? "" : personal.swimmer ? "true" : "false",
        languages: textValue(personal.languages),
    };

    const { register, control, handleSubmit, formState: { isSubmitting, errors } } = useForm<OCFormData>({
        defaultValues: formDefaults,
    });

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(
        defaultValues.photo ? String(defaultValues.photo) : null
    );
    const [apiErrors, setApiErrors] = useState<Record<string, string[]> | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleFormSubmit = async (data: OCFormData) => {
        setApiErrors(null);

        if (!data.courseId) {
            setApiErrors({ courseId: ["Please select a course"] });
            return;
        }

        if (!data.name?.trim()) {
            setApiErrors({ name: ["Full name is required"] });
            return;
        }

        if (!data.ocNo?.trim()) {
            setApiErrors({ ocNo: ["OC No is required"] });
            return;
        }

        if (!data.arrivalAtUniversity) {
            setApiErrors({ arrivalAtUniversity: ["Arrival date is required"] });
            return;
        }

        const submitData: Partial<OCRecord> = {
            name: data.name.trim(),
            ocNo: data.ocNo.trim(),
            jnuEnrollmentNo: nullableText(data.jnuEnrollmentNo),
            courseId: data.courseId,
            branch: data.branch ? (data.branch as OCRecord["branch"]) : null,
            platoonId: data.platoonId || null,
            arrivalAtUniversity: data.arrivalAtUniversity,
            personal: {
                visibleIdentMarks: nullableText(data.visibleIdentMarks),
                pi: nullableText(data.pi),
                dob: data.dob || null,
                placeOfBirth: nullableText(data.placeOfBirth),
                domicile: nullableText(data.domicile),
                religion: nullableText(data.religion),
                nationality: nullableText(data.nationality),
                bloodGroup: nullableText(data.bloodGroup),
                identMarks: nullableText(data.identMarks),
                mobileNo: nullableText(data.mobileNo),
                email: nullableText(data.email),
                passportNo: nullableText(data.passportNo),
                panNo: nullableText(data.panNo)?.toUpperCase() ?? null,
                aadhaarNo: nullableText(data.aadhaarNo),
                fatherName: nullableText(data.fatherName),
                fatherMobile: nullableText(data.fatherMobile),
                fatherAddrPerm: nullableText(data.fatherAddrPerm),
                fatherAddrPresent: nullableText(data.fatherAddrPresent),
                fatherProfession: nullableText(data.fatherProfession),
                guardianName: nullableText(data.guardianName),
                guardianAddress: nullableText(data.guardianAddress),
                monthlyIncome: nullableNumber(data.monthlyIncome),
                nokDetails: nullableText(data.nokDetails),
                nokAddrPerm: nullableText(data.nokAddrPerm),
                nokAddrPresent: nullableText(data.nokAddrPresent),
                nearestRailwayStation: nullableText(data.nearestRailwayStation),
                familyInSecunderabad: nullableText(data.familyInSecunderabad),
                relativeInArmedForces: nullableText(data.relativeInArmedForces),
                govtFinancialAssistance: Boolean(data.govtFinancialAssistance),
                bankDetails: nullableText(data.bankDetails),
                idenCardNo: nullableText(data.idenCardNo),
                upscRollNo: nullableText(data.upscRollNo),
                ssbCentre: nullableText(data.ssbCentre),
                games: nullableText(data.games),
                hobbies: nullableText(data.hobbies),
                swimmer: data.swimmer === "" ? null : data.swimmer === "true",
                languages: nullableText(data.languages),
            },
        };

        if (selectedFile) {
            submitData.photo = selectedFile;
        }

        try {
            await onSubmit(submitData);
        } catch (error: any) {
            if (error.issues && error.issues.fieldErrors) {
                setApiErrors(error.issues.fieldErrors);
            }
        }
    };

    const getFieldError = (fieldName: keyof OCFormData): string | null => {
        if (errors[fieldName]?.message) {
            return errors[fieldName]?.message as string;
        }
        if (apiErrors && apiErrors[fieldName]) {
            return apiErrors[fieldName][0];
        }
        return null;
    };

    const input = (
        name: keyof OCFormData,
        label: string,
        props: ComponentProps<typeof Input> = {},
        wide = false,
    ) => (
        <FieldShell label={label} error={getFieldError(name)} htmlFor={String(name)} wide={wide}>
            <Input id={String(name)} {...register(name)} {...props} />
        </FieldShell>
    );

    const textarea = (name: keyof OCFormData, label: string, wide = true) => (
        <FieldShell label={label} error={getFieldError(name)} htmlFor={String(name)} wide={wide}>
            <textarea
                id={String(name)}
                {...register(name)}
                rows={3}
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
        </FieldShell>
    );

    const phoneInput = (name: keyof OCFormData, label: string) => (
        <FieldShell label={label} error={getFieldError(name)} htmlFor={String(name)}>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <IndiaPhoneInput
                        id={String(name)}
                        value={(field.value as string | undefined) ?? ""}
                        onValueChange={field.onChange}
                        placeholder="9876543210"
                        autoComplete="tel-national"
                    />
                )}
            />
        </FieldShell>
    );

    const sectionLinks = [
        { id: "oc-core-details", label: "Core details" },
        { id: "oc-personal-details", label: "Personal" },
        { id: "oc-contact-details", label: "Contact and IDs" },
        { id: "oc-family-details", label: "Family and NOK" },
        { id: "oc-other-details", label: "Other details" },
    ];

    return (
        <DialogContent className={OC_FORM_DIALOG_CONTENT_CLASS}>
            <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12">
                <DialogTitle>{isEditing ? "Edit OC" : "Add New OC"}</DialogTitle>
                <DialogDescription>
                    Maintain the OC identity, current placement, and imported profile details.
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(handleFormSubmit)} className="min-h-0 flex flex-1 flex-col">
                <div className={OC_FORM_BODY_CLASS}>
                    {apiErrors && Object.keys(apiErrors).length > 0 && (
                        <Alert variant="destructive" className="mb-5">
                            <AlertDescription>
                                <div className="font-semibold mb-2">Validation failed. Please fix the following errors:</div>
                                <ul className="list-disc list-inside space-y-1">
                                    {Object.entries(apiErrors).map(([field, messages]) => (
                                        <li key={field} className="text-sm">
                                            <strong>{field}:</strong> {messages[0]}
                                        </li>
                                    ))}
                                </ul>
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
                        <aside className="hidden xl:block">
                            <nav className="sticky top-0 rounded-md border bg-background p-3 text-sm shadow-sm">
                                <div className="mb-2 px-2 text-xs font-medium uppercase text-muted-foreground">
                                    Sections
                                </div>
                                <div className="space-y-1">
                                    {sectionLinks.map((section) => (
                                        <a
                                            key={section.id}
                                            href={`#${section.id}`}
                                            className="block rounded px-2 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        >
                                            {section.label}
                                        </a>
                                    ))}
                                </div>
                            </nav>
                        </aside>

                        <div className="space-y-5">
                            <FormSection
                                id="oc-core-details"
                                title="Core Details"
                                description="Identity, course, platoon, branch, arrival, and photo."
                            >
                                <div className="rounded-md border border-dashed bg-muted/20 p-4 md:col-span-2 xl:col-span-3">
                                    <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
                                        <div>
                                            {previewUrl ? (
                                                <img
                                                    src={previewUrl}
                                                    alt="OC photo preview"
                                                    className="h-32 w-32 rounded-md border object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-32 w-32 items-center justify-center rounded-md border bg-background text-xs text-muted-foreground">
                                                    No photo
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="oc-photo">Upload Photo</Label>
                                            <Input
                                                id="oc-photo"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                {selectedFile ? `Selected: ${selectedFile.name}` : "Optional image for OC profile display."}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <FieldShell label="Full Name *" error={getFieldError("name")} htmlFor="name">
                                    <Input
                                        id="name"
                                        {...register("name", {
                                            required: "Full name is required",
                                            minLength: { value: 2, message: "Full name must be at least 2 characters" },
                                        })}
                                        placeholder="Enter full name"
                                    />
                                </FieldShell>

                                <FieldShell label="OC No / TES No *" error={getFieldError("ocNo")} htmlFor="ocNo">
                                    <Input
                                        id="ocNo"
                                        {...register("ocNo", {
                                            required: "OC No is required",
                                            pattern: {
                                                value: /^[A-Z0-9-]+$/i,
                                                message: "OC No should contain only letters, numbers and hyphens",
                                            },
                                        })}
                                        placeholder="Enter OC number"
                                    />
                                </FieldShell>

                                {input("jnuEnrollmentNo", "JNU Enrollment No", {
                                    inputMode: "numeric",
                                    placeholder: "Enter JNU enrollment number",
                                })}

                                <FieldShell label="Course *" error={getFieldError("courseId")}>
                                    <Controller
                                        name="courseId"
                                        control={control}
                                        rules={{ required: "Course is required" }}
                                        render={({ field }) => (
                                            <SearchableSelect
                                                value={field.value ?? ""}
                                                onValueChange={field.onChange}
                                                options={courses.map(({ id, code, title }) => ({
                                                    value: id,
                                                    label: code ? `${code}${title ? ` - ${title}` : ""}` : title ?? id,
                                                }))}
                                                placeholder="Select Course"
                                                searchPlaceholder="Search course..."
                                                emptyLabel="No course found"
                                            />
                                        )}
                                    />
                                </FieldShell>

                                <FieldShell label="Branch" error={getFieldError("branch")} htmlFor="branch">
                                    <select
                                        id="branch"
                                        {...register("branch")}
                                        className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="">Select Branch</option>
                                        <option value="O">O (Others)</option>
                                        <option value="E">E (Electronics)</option>
                                        <option value="M">M (Mechanical)</option>
                                    </select>
                                </FieldShell>

                                <FieldShell label="Platoon" error={getFieldError("platoonId")}>
                                    <Controller
                                        name="platoonId"
                                        control={control}
                                        render={({ field }) => (
                                            <SearchableSelect
                                                value={field.value ?? ""}
                                                onValueChange={field.onChange}
                                                options={platoons.map(({ id, key, name }) => ({
                                                    value: id,
                                                    label: key && name ? `${key} - ${name}` : name ?? key ?? id,
                                                }))}
                                                placeholder="Select Platoon"
                                                searchPlaceholder="Search platoon..."
                                                allOptionLabel="No Platoon"
                                                emptyLabel="No platoon found"
                                            />
                                        )}
                                    />
                                </FieldShell>

                                <FieldShell label="Arrival Date *" error={getFieldError("arrivalAtUniversity")} htmlFor="arrivalAtUniversity">
                                    <Input
                                        id="arrivalAtUniversity"
                                        type="date"
                                        {...register("arrivalAtUniversity", { required: "Arrival date is required" })}
                                    />
                                </FieldShell>
                            </FormSection>

                            <FormSection
                                id="oc-personal-details"
                                title="Imported Personal Details"
                                description="Personal values imported from the OC bulk sheet."
                            >
                                {input("visibleIdentMarks", "Visible Ident Marks")}
                                {input("pi", "PI")}
                                {input("dob", "DOB", { type: "date" })}
                                {input("placeOfBirth", "Place of Birth")}
                                {input("domicile", "Domicile")}
                                {input("religion", "Religion")}
                                {input("nationality", "Nationality")}
                                {input("bloodGroup", "Blood Group")}
                                {textarea("identMarks", "Identification Marks")}
                            </FormSection>

                            <FormSection
                                id="oc-contact-details"
                                title="Contact And IDs"
                                description="Communication, identity, and reference numbers."
                            >
                                {phoneInput("mobileNo", "Govt Fin Asst Mob No / Mobile No")}
                                {input("email", "Email", { type: "email" })}
                                {input("passportNo", "Passport No")}
                                {input("panNo", "PAN Card No")}
                                {input("aadhaarNo", "Aadhaar No")}
                                {input("upscRollNo", "UPSC Roll No")}
                                {input("idenCardNo", "Iden Card No")}
                                {textarea("bankDetails", "Bank Details")}
                            </FormSection>

                            <FormSection
                                id="oc-family-details"
                                title="Family And NOK"
                                description="Family, guardian, address, and next-of-kin details."
                            >
                                {input("fatherName", "Father's Name")}
                                {phoneInput("fatherMobile", "Father's Mobile")}
                                {input("fatherProfession", "Father's Profession")}
                                {input("guardianName", "Guardian Name")}
                                {input("monthlyIncome", "Income (Parents)", { inputMode: "numeric" })}
                                {input("nearestRailwayStation", "Nearest Railway Station")}
                                {textarea("fatherAddrPerm", "Father's Address")}
                                {textarea("guardianAddress", "Guardian Address")}
                                {textarea("nokDetails", "Details of NOK")}
                                {textarea("nokAddrPerm", "Permanent Address")}
                                {textarea("nokAddrPresent", "Present Address")}
                                {textarea("familyInSecunderabad", "Family/Friends Address in Secunderabad")}
                                {textarea("relativeInArmedForces", "Near Relative in Armed Forces")}
                                <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2">
                                    <input
                                        id="govtFinancialAssistance"
                                        type="checkbox"
                                        {...register("govtFinancialAssistance")}
                                        className="h-4 w-4"
                                    />
                                    <Label htmlFor="govtFinancialAssistance">Govt Financial Assistance</Label>
                                </div>
                            </FormSection>

                            <FormSection
                                id="oc-other-details"
                                title="Other Imported Details"
                                description="SSB, games, hobbies, swimmer status, and languages."
                            >
                                {input("ssbCentre", "SSB Centre")}
                                <FieldShell label="Swimmer/Non Swimmer" error={getFieldError("swimmer")} htmlFor="swimmer">
                                    <select
                                        id="swimmer"
                                        {...register("swimmer")}
                                        className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                                    >
                                        <option value="">Select Status</option>
                                        <option value="true">Swimmer</option>
                                        <option value="false">Non Swimmer</option>
                                    </select>
                                </FieldShell>
                                {textarea("games", "Games")}
                                {textarea("hobbies", "Hobbies")}
                                {textarea("languages", "Languages")}
                            </FormSection>
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 flex-col gap-3 border-t bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">Fields marked * are required.</p>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update" : "Save")}
                        </Button>
                    </div>
                </div>
            </form>
        </DialogContent>
    );
}
