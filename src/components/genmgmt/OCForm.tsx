"use client";

import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import type { ComponentProps } from "react";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OCRecord, type OCPersonalProfile } from "@/app/lib/api/ocApi";
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

function sectionTitle(title: string) {
    return (
        <div className="col-span-2 border-t pt-4 first:border-t-0 first:pt-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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
    ) => (
        <div>
            <Label>{label}</Label>
            <Input {...register(name)} {...props} />
            {getFieldError(name) && (
                <p className="text-sm text-destructive mt-1">{getFieldError(name)}</p>
            )}
        </div>
    );

    const textarea = (name: keyof OCFormData, label: string) => (
        <div>
            <Label>{label}</Label>
            <textarea
                {...register(name)}
                rows={3}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {getFieldError(name) && (
                <p className="text-sm text-destructive mt-1">{getFieldError(name)}</p>
            )}
        </div>
    );

    return (
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{isEditing ? "Edit OC" : "Add New OC"}</DialogTitle>
            </DialogHeader>

            {apiErrors && Object.keys(apiErrors).length > 0 && (
                <Alert variant="destructive" className="mb-4">
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

            <form onSubmit={handleSubmit(handleFormSubmit)} className="grid grid-cols-2 gap-4 mb-6">
                {sectionTitle("Core Details")}

                <div className="col-span-2">
                    <Label>Upload Photo</Label>
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    {(selectedFile || previewUrl) && (
                        <div className="mt-2">
                            {selectedFile && (
                                <p className="text-sm text-muted-foreground">
                                    Selected: {selectedFile.name}
                                </p>
                            )}
                            {previewUrl && (
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="mt-2 w-32 h-32 object-cover rounded border"
                                />
                            )}
                        </div>
                    )}
                </div>

                <div>
                    <Label>Full Name *</Label>
                    <Input
                        {...register("name", {
                            required: "Full name is required",
                            minLength: { value: 2, message: "Full name must be at least 2 characters" }
                        })}
                        placeholder="Enter full name"
                    />
                    {getFieldError("name") && (
                        <p className="text-sm text-destructive mt-1">{getFieldError("name")}</p>
                    )}
                </div>

                <div>
                    <Label>OC No / TES No *</Label>
                    <Input
                        {...register("ocNo", {
                            required: "OC No is required",
                            pattern: {
                                value: /^[A-Z0-9-]+$/i,
                                message: "OC No should contain only letters, numbers and hyphens"
                            }
                        })}
                        placeholder="Enter OC number"
                    />
                    {getFieldError("ocNo") && (
                        <p className="text-sm text-destructive mt-1">{getFieldError("ocNo")}</p>
                    )}
                </div>

                {input("jnuEnrollmentNo", "JNU Enrollment No", {
                    inputMode: "numeric",
                    placeholder: "Enter JNU enrollment number",
                })}

                <div>
                    <Label>Course *</Label>
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
                    {getFieldError("courseId") && (
                        <p className="text-sm text-destructive mt-1">{getFieldError("courseId")}</p>
                    )}
                </div>

                <div>
                    <Label>Branch</Label>
                    <select
                        {...register("branch")}
                        className="w-full border rounded-md p-2 bg-background"
                    >
                        <option value="">Select Branch</option>
                        <option value="O">O (Others)</option>
                        <option value="E">E (Electronics)</option>
                        <option value="M">M (Mechanical)</option>
                    </select>
                    {getFieldError("branch") && (
                        <p className="text-sm text-destructive mt-1">{getFieldError("branch")}</p>
                    )}
                </div>

                <div>
                    <Label>Platoon</Label>
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
                    {getFieldError("platoonId") && (
                        <p className="text-sm text-destructive mt-1">{getFieldError("platoonId")}</p>
                    )}
                </div>

                <div>
                    <Label>Arrival Date *</Label>
                    <Input
                        type="date"
                        {...register("arrivalAtUniversity", { required: "Arrival date is required" })}
                    />
                    {getFieldError("arrivalAtUniversity") && (
                        <p className="text-sm text-destructive mt-1">{getFieldError("arrivalAtUniversity")}</p>
                    )}
                </div>

                {sectionTitle("Imported Personal Details")}
                {input("visibleIdentMarks", "Visible Ident Marks")}
                {input("pi", "PI")}
                {input("dob", "DOB", { type: "date" })}
                {input("placeOfBirth", "Place of Birth")}
                {input("domicile", "Domicile")}
                {input("religion", "Religion")}
                {input("nationality", "Nationality")}
                {input("bloodGroup", "Blood Group")}
                {textarea("identMarks", "Identification Marks")}

                {sectionTitle("Contact And IDs")}
                {input("mobileNo", "Govt Fin Asst Mob No / Mobile No")}
                {input("email", "Email", { type: "email" })}
                {input("passportNo", "Passport No")}
                {input("panNo", "PAN Card No")}
                {input("aadhaarNo", "Aadhaar No")}
                {input("upscRollNo", "UPSC Roll No")}
                {input("idenCardNo", "Iden Card No")}
                {textarea("bankDetails", "Bank Details")}

                {sectionTitle("Family And NOK")}
                {input("fatherName", "Father's Name")}
                {input("fatherMobile", "Father's Mobile")}
                {textarea("fatherAddrPerm", "Father's Address")}
                {input("fatherProfession", "Father's Profession")}
                {input("guardianName", "Guardian Name")}
                {textarea("guardianAddress", "Guardian Address")}
                {input("monthlyIncome", "Income (Parents)", { inputMode: "numeric" })}
                {textarea("nokDetails", "Details of NOK")}
                {textarea("nokAddrPerm", "Permanent Address")}
                {textarea("nokAddrPresent", "Present Address")}
                {input("nearestRailwayStation", "Nearest Railway Station")}
                {textarea("familyInSecunderabad", "Family/Friends Address in Secunderabad")}
                {textarea("relativeInArmedForces", "Near Relative in Armed Forces")}
                <div className="flex items-center gap-2 pt-7">
                    <input
                        id="govtFinancialAssistance"
                        type="checkbox"
                        {...register("govtFinancialAssistance")}
                        className="h-4 w-4"
                    />
                    <Label htmlFor="govtFinancialAssistance">Govt Financial Assistance</Label>
                </div>

                {sectionTitle("Other Imported Details")}
                {input("ssbCentre", "SSB Centre")}
                {textarea("games", "Games")}
                {textarea("hobbies", "Hobbies")}
                <div>
                    <Label>Swimmer/Non Swimmer</Label>
                    <select
                        {...register("swimmer")}
                        className="w-full border rounded-md p-2 bg-background"
                    >
                        <option value="">Select Status</option>
                        <option value="true">Swimmer</option>
                        <option value="false">Non Swimmer</option>
                    </select>
                </div>
                {textarea("languages", "Languages")}

                <div className="col-span-2 flex justify-end gap-2 mt-4">
                    <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update" : "Save")}
                    </Button>
                </div>
            </form>
        </DialogContent>
    );
}
