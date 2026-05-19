"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useAutobiography } from "@/hooks/useAutobiography";
import { AutoBio } from "@/types/background-detls";
import { AutoBioPayload } from "@/app/lib/api/autobiographyApi";
import { getUsersByQuery, type User } from "@/app/lib/api/userApi";
import type { RootState } from "@/store";
import { saveAutobiographyForm, clearAutobiographyForm } from "@/store/slices/autobiographySlice";
import { ApiClientError } from "@/app/lib/apiClient";
import type { Cadet } from "@/types/cadet";

type Props = {
    ocId: string;
    cadet: Partial<Cadet> | null;
};

const textFields = ["general", "proficiency", "work", "additional"] as const;
type TextFieldKey = typeof textFields[number];

let platoonCommanderUsersPromise: Promise<User[]> | null = null;

const platoonCommanderSearchTerms = [
    "PLATOON_COMMANDER",
    "Platoon Commander",
    "PL_CDR",
    "PL CDR",
    "PLCDR",
    "PLATOON_CDR",
    "Platoon Cdr",
    "PTN_CDR",
    "PTN CDR",
    "platoon-commander",
];

function mergeUsersByIdentity(usersByQuery: User[][]): User[] {
    const seen = new Set<string>();
    const merged: User[] = [];

    for (const users of usersByQuery) {
        for (const user of users) {
            const identity = user.id ?? user.username ?? `${user.rank ?? ""}:${user.name}`;
            if (seen.has(identity)) continue;
            seen.add(identity);
            merged.push(user);
        }
    }

    return merged;
}

function getCachedPlatoonCommanderUsers() {
    if (!platoonCommanderUsersPromise) {
        platoonCommanderUsersPromise = Promise.all(
            platoonCommanderSearchTerms.map((term) => getUsersByQuery(term, 100))
        )
            .then(mergeUsersByIdentity)
            .catch((error) => {
                platoonCommanderUsersPromise = null;
                throw error;
            });
    }

    return platoonCommanderUsersPromise;
}

const textFieldLabels: Record<TextFieldKey, string> = {
    general: "General Self Assessment",
    proficiency: "Proficiency in Sports & Games",
    work: "Achievements of Note",
    additional: "Areas to Work Upon",
};

/** Convert an ISO / timestamp string to yyyy-MM-dd for <input type="date"> */
function toDateInputValue(iso: string | null | undefined): string {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().slice(0, 10); // yyyy-MM-dd
    } catch {
        return "";
    }
}

/** Today as yyyy-MM-dd */
function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

function normalizeAppointmentToken(value: string | null | undefined): string {
    return (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function isPlatoonCommanderAppointment(appointment: NonNullable<User["activeAppointments"]>[number]) {
    const key = normalizeAppointmentToken(appointment.positionKey);
    const name = normalizeAppointmentToken(appointment.positionName);
    return ["PL_CDR", "PLCDR", "PLATOON_COMMANDER", "PLATOON_CDR", "PTN_CDR"].some(
        (token) => key === token || name === token
    );
}

function appointmentMatchesCadetPlatoon(
    appointment: NonNullable<User["activeAppointments"]>[number],
    cadet: Partial<Cadet> | null
) {
    if (!isPlatoonCommanderAppointment(appointment)) return false;
    if (normalizeAppointmentToken(appointment.scopeType) !== "PLATOON") return false;

    const cadetPlatoonRefs = [
        cadet?.platoonId,
        cadet?.platoonKey,
        cadet?.platoonName,
    ]
        .filter(Boolean)
        .map((value) => String(value).trim().toLowerCase());

    if (cadetPlatoonRefs.length === 0) return true;

    const scopeId = (appointment.scopeId ?? "").trim().toLowerCase();
    return Boolean(scopeId && cadetPlatoonRefs.includes(scopeId));
}

function formatCommanderLabel(user: User): string {
    return user.rank ? `${user.rank} ${user.name}` : user.name;
}

function toFormValues(autoBio: AutoBioPayload, cadetName: string): AutoBio {
    return {
        general: autoBio.generalSelf ?? "",
        proficiency: autoBio.proficiencySports ?? "",
        work: autoBio.achievementsNote ?? "",
        additional: autoBio.areasToWork || autoBio.additionalInfo || "",
        date: toDateInputValue(autoBio.filledOn),
        sign_oc: cadetName,
        sign_pi: autoBio.platoonCommanderName ?? "",
    };
}

function hasAutoBioValues(autoBio: AutoBioPayload): boolean {
    return [
        autoBio.generalSelf,
        autoBio.proficiencySports,
        autoBio.achievementsNote,
        autoBio.areasToWork,
        autoBio.additionalInfo,
        autoBio.filledOn,
        autoBio.platoonCommanderName,
    ].some((value) => Boolean(value?.trim()));
}

export default function AutobiographySection({ ocId, cadet }: Props) {
    const [isEditing, setIsEditing] = useState(false);
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [commanderOptions, setCommanderOptions] = useState<Array<{ id: string; label: string }>>([]);
    const [isLoadingCommanders, setIsLoadingCommanders] = useState(false);
    const isInitialLoad = useRef(true);

    // Redux
    const dispatch = useDispatch();
    const savedFormData = useSelector((state: RootState) =>
        state.autobiography.forms[ocId]
    );

    const { autoBio, hasFetched, fetchAutoBio, save } = useAutobiography(ocId);

    const { register, handleSubmit, reset, watch, setValue } = useForm<AutoBio>({
        defaultValues: {
            general: "",
            proficiency: "",
            work: "",
            additional: "",
            date: "",
            sign_oc: "",
            sign_pi: "",
        },
    });

    const cadetName = cadet?.name ?? "";
    const selectedCommander = watch("sign_pi") ?? "";
    const defaultCommanderName = commanderOptions[0]?.label ?? "";
    const hasCommanderOptions = commanderOptions.length > 0;
    const cadetPlatoonLookup = useMemo(
        () => ({
            platoonId: cadet?.platoonId,
            platoonKey: cadet?.platoonKey,
            platoonName: cadet?.platoonName,
        }),
        [cadet?.platoonId, cadet?.platoonKey, cadet?.platoonName]
    );

    useEffect(() => {
        if (!isEditing) return;

        let cancelled = false;
        const loadPlatoonCommanders = async () => {
            setIsLoadingCommanders(true);
            try {
                const users = await getCachedPlatoonCommanderUsers();

                let matchedUsers = users.filter((user) =>
                    user.activeAppointments?.some((appointment) =>
                        appointmentMatchesCadetPlatoon(appointment, cadetPlatoonLookup)
                    )
                );

                if (
                    matchedUsers.length === 0 &&
                    !cadetPlatoonLookup.platoonId &&
                    !cadetPlatoonLookup.platoonKey &&
                    !cadetPlatoonLookup.platoonName
                ) {
                    matchedUsers = users.filter((user) =>
                        user.activeAppointments?.some(isPlatoonCommanderAppointment)
                    );
                }

                if (matchedUsers.length === 0) {
                    matchedUsers = users;
                }

                if (cancelled) return;

                const options = matchedUsers.map((user) => ({
                    id: user.id ?? `${user.username}-${user.name}`,
                    label: formatCommanderLabel(user),
                }));

                // Keep labels unique for Select value matching.
                const deduped = Array.from(
                    new Map(options.map((option) => [option.label, option])).values()
                );
                setCommanderOptions(deduped);
            } catch {
                if (cancelled) return;
                setCommanderOptions([]);
                if (isEditing) toast.error("Failed to load platoon commanders");
            } finally {
                if (!cancelled) setIsLoadingCommanders(false);
            }
        };

        void loadPlatoonCommanders();
        return () => {
            cancelled = true;
        };
    }, [cadetPlatoonLookup, isEditing]);

    useEffect(() => {
        if (!isEditing || selectedCommander || !defaultCommanderName) return;
        setValue("sign_pi", defaultCommanderName, { shouldDirty: false });
    }, [defaultCommanderName, isEditing, selectedCommander, setValue]);

    // Auto-save to Redux on form changes (only when editing and not initial load)
    useEffect(() => {
        if (!isEditing || isInitialLoad.current) return;

        const subscription = watch((value) => {
            const formData = {
                general: value.general || "",
                proficiency: value.proficiency || "",
                work: value.work || "",
                additional: value.additional || "",
                date: value.date || "",
                sign_oc: value.sign_oc || "",
                sign_pi: value.sign_pi || "",
            };
            dispatch(saveAutobiographyForm({ ocId, data: formData }));
        });
        return () => subscription.unsubscribe();
    }, [watch, dispatch, ocId, isEditing]);

    // Load data from backend
    useEffect(() => {
        fetchAutoBio();
    }, [fetchAutoBio]);

    // Initialize form data after the backend response is known.
    useEffect(() => {
        if (!hasFetched || isEditing) return;

        if (autoBio && (hasAutoBioValues(autoBio) || !savedFormData || !isInitialLoad.current)) {
            reset(toFormValues(autoBio, cadetName));
            setIsEditing(false);
            isInitialLoad.current = false;
            return;
        }

        // If no backend data but we have saved form data in Redux
        if (savedFormData && isInitialLoad.current) {
            reset(savedFormData);
            setIsEditing(false);
            isInitialLoad.current = false;
            return;
        }

        // If no data at all — default date to today
        reset({
            general: "",
            proficiency: "",
            work: "",
            additional: "",
            date: todayStr(),
            sign_oc: cadetName,
            sign_pi: defaultCommanderName,
        });
        setIsEditing(false);
        isInitialLoad.current = false;
    }, [autoBio, cadetName, defaultCommanderName, hasFetched, isEditing, reset, savedFormData]);

    // Save handler
    const onSubmit = async (form: AutoBio) => {
        const {
            general,
            proficiency,
            work,
            additional,
            date,
            sign_pi,
        } = form;

        // Convert yyyy-MM-dd to ISO string for the backend
        const filledOnISO = date ? new Date(date).toISOString() : "";

        const payload: AutoBioPayload = {
            generalSelf: general,
            proficiencySports: proficiency,
            achievementsNote: work,
            areasToWork: additional,
            additionalInfo: additional,
            filledOn: filledOnISO,
            platoonCommanderName: sign_pi,
        };

        try {
            const saved = await save(payload);
            if (saved) {
                toast.success("Autobiography saved successfully!");
                // Clear Redux cache after successful save
                dispatch(clearAutobiographyForm(ocId));
                setIsEditing(false);
                fetchAutoBio();
            } else {
                toast.error("Failed to save autobiography");
            }
        } catch (err) {
            if (err instanceof ApiClientError) {
                toast.error(err.message);
                const issues = err.extras?.issues as any;
                if (issues?.fieldErrors) {
                    Object.entries(issues.fieldErrors).forEach(([field, msgs]: [string, any]) => {
                        if (Array.isArray(msgs)) msgs.forEach((m: string) => toast.error(`${field}: ${m}`));
                    });
                }
            } else {
                toast.error("Failed to save autobiography");
            }
        }
    };

    // Clear form handler
    const handleClearForm = () => setShowClearDialog(true);
    const confirmClearForm = () => {
        dispatch(clearAutobiographyForm(ocId));
        reset({
            general: "",
            proficiency: "",
            work: "",
            additional: "",
            date: todayStr(),
            sign_oc: cadetName,
            sign_pi: defaultCommanderName,
        });
        toast.info("Form cleared");
        setShowClearDialog(false);
    };

    // Cancel handler
    const handleCancel = () => {
        // If we have backend data, restore it
        if (autoBio) {
            reset(toFormValues(autoBio, cadetName));
        }
        setIsEditing(false);
    };

    return (
        <Card className="shadow-lg rounded-2xl border border-border w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-xl font-bold text-center uppercase text-primary">
                    Confidential – Autobiography Form
                </CardTitle>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    {/* TEXTAREAS */}
                    {textFields.map((field, idx) => {
                        const label = textFieldLabels[field];

                        return (
                            <div key={field}>
                                <label className="block font-semibold mb-2">
                                    {idx + 1}. {label}
                                </label>
                                <Textarea
                                    {...register(field)}
                                    disabled={!isEditing}
                                    rows={4}
                                />
                            </div>
                        );
                    })}

                    {/* DATE — bound to filledOn */}
                    <div>
                        <label className="block font-semibold mb-2">Date</label>
                        <Input type="date" disabled={!isEditing} {...register("date")} />
                    </div>

                    {/* SIGNATURES */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block font-semibold mb-2">Name of Cadet (OC)</label>
                            <Input disabled={!isEditing} {...register("sign_oc")} />
                        </div>

                        <div>
                            <label className="block font-semibold mb-2">Name of Platoon Commander</label>
                            {isEditing ? (
                                <Select
                                    value={selectedCommander || undefined}
                                    onValueChange={(val) =>
                                        setValue("sign_pi", val, { shouldDirty: true })
                                    }
                                    disabled={isLoadingCommanders}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue
                                            placeholder={
                                                isLoadingCommanders
                                                    ? "Loading platoon commanders..."
                                                    : "Select platoon commander"
                                            }
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectedCommander &&
                                            !commanderOptions.some((option) => option.label === selectedCommander) && (
                                                <SelectItem value={selectedCommander}>
                                                    {selectedCommander}
                                                </SelectItem>
                                            )}
                                        {commanderOptions.map((option) => (
                                            <SelectItem key={option.id} value={option.label}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                        {!hasCommanderOptions && !selectedCommander && !isLoadingCommanders && (
                                            <SelectItem value="__no_platoon_commanders__" disabled>
                                                No platoon commanders found
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Input disabled value={selectedCommander || defaultCommanderName || ""} />
                            )}
                        </div>
                    </div>

                    {/* BUTTONS */}
                    <div className="flex justify-center gap-2 mt-6">
                        {!isEditing ? (
                            <Button type="button" className="w-[200px]" onClick={() => setIsEditing(true)}>
                                Edit
                            </Button>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-[200px] hover:bg-destructive hover:text-primary-foreground"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-[200px]"
                                    onClick={handleClearForm}
                                >
                                    Clear Form
                                </Button>

                                <Button type="submit" className="w-[200px] bg-success">
                                    Save
                                </Button>
                            </>
                        )}
                    </div>

                    {isEditing && savedFormData && !isInitialLoad.current && (
                        <p className="text-sm text-muted-foreground text-center mt-2">
                            * Changes are automatically saved
                        </p>
                    )}
                </form>

                {/* CLEAR FORM CONFIRMATION DIALOG */}
                <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Clear Form</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to clear all unsaved changes? This will reset the form.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmClearForm}>Clear</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}
