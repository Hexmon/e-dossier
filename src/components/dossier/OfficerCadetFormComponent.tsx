"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import type { OfficerCadetForm } from "@/types/dossierSnap";
import { saveForm, clearForm } from "@/store/slices/officerCadetFormSlice";
import type { RootState } from "@/store";
import { useDebounce } from "@/hooks/useDebounce";
import { useOcDetails } from "@/hooks/useOcDetails";

interface Props {
    ocId: string;
    onSave?: (data: OfficerCadetForm) => void;
}

export default function OfficerCadetFormComponent({ ocId, onSave }: Props) {
    const dispatch = useDispatch();

    const { cadet } = useOcDetails(ocId);

    if (!cadet) return null;

    const selectedCadet = {
        name: cadet.name,
        courseName: cadet.courseName,
        ocNumber: cadet.ocNumber,
        ocId: cadet.ocId,
        course: cadet.course,
    };


    /*  Redux Persist */
    const savedData = useSelector(
        (state: RootState) => state.officerCadetForm.forms[ocId]
    );

    const form = useForm<OfficerCadetForm>({
        defaultValues: {
            arrivalPhoto: null,
            departurePhoto: null,
            tesNo: "",
            name: "",
            course: "",
            pi: "",
            dtOfArr: "",
            relegated: "",
            withdrawnOn: "",
            dtOfPassingOut: "",
            icNo: "",
            orderOfMerit: "",
            regtArm: "",
            postedAtt: "",
        },
    });

    const { register, handleSubmit, reset, watch } = form;

    /* Load persisted data */
    useEffect(() => {
        if (savedData) {
            reset(savedData);
        }
    }, [savedData, reset]);

    /* Auto-save (debounced) */
    const debouncedValues = useDebounce(watch(), 500);

    useEffect(() => {
        if (!debouncedValues) return;

        const hasAnyData = Object.values(debouncedValues).some(val => {
            if (val === null || val === undefined || val === "") return false;
            if (typeof val === "object" && "length" in val) {
                return (val as FileList).length > 0;
            }
            return true;
        });

        if (hasAnyData) {
            dispatch(saveForm({ ocId, data: debouncedValues }));
        }
    }, [debouncedValues, dispatch, ocId]);

    const onSubmit = (data: OfficerCadetForm) => {
        if (!data.name?.trim()) {
            toast.error("Please provide the cadet name");
            return;
        }

        dispatch(saveForm({ ocId, data }));
        onSave?.(data);
        toast.success("Form saved successfully");
    };

    const handleReset = () => {
        if (!confirm("Clear all officer cadet details?")) return;

        reset({
            arrivalPhoto: null,
            departurePhoto: null,
            tesNo: "",
            name: "",
            course: "",
            pi: "",
            dtOfArr: "",
            relegated: "",
            withdrawnOn: "",
            dtOfPassingOut: "",
            icNo: "",
            orderOfMerit: "",
            regtArm: "",
            postedAtt: "",
        });

        dispatch(clearForm(ocId));
        toast.info("Form cleared");
    };

    return (
        <Tabs defaultValue="form">
            <TabsList className="mb-6">
                <TabsTrigger value="form">Fill Form</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            {/* FORM TAB */}
            <TabsContent value="form">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="text-xs text-gray-500 text-right">
                        ✓ Changes are saved automatically
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col items-center border p-4 rounded-lg">
                            <Label>Arrival (Civil Dress)</Label>
                            <Input type="file" accept="image/*" {...register("arrivalPhoto")} />
                        </div>
                        <div className="flex flex-col items-center border p-4 rounded-lg">
                            <Label>Departure (Uniform)</Label>
                            <Input type="file" accept="image/*" {...register("departurePhoto")} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input placeholder="TES No" {...register("tesNo")} />
                        <Input placeholder="Name" {...register("name")} />
                        <Input placeholder="Course" {...register("course")} />
                        <Input placeholder="PI" {...register("pi")} />
                        <Input type="date" {...register("dtOfArr")} />
                        <Input placeholder="Relegated" {...register("relegated")} />
                        <Input type="date" {...register("withdrawnOn")} />
                    </div>

                    <h3 className="font-semibold bg-blue-100 px-4 py-1 rounded-2xl">
                        Commissioning Details
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <Input type="date" {...register("dtOfPassingOut")} />
                        <Input placeholder="IC No" {...register("icNo")} />
                        <Input placeholder="Order of Merit" {...register("orderOfMerit")} />
                        <Input placeholder="Regt / Arm" {...register("regtArm")} />
                        <Input className="col-span-2" placeholder="Posted / Attached To" {...register("postedAtt")} />
                    </div>

                    <div className="flex justify-center gap-4">
                        <Button type="submit" className="w-40 bg-[#40ba4d]">Submit</Button>
                        <Button type="button" variant="outline" className="w-40" onClick={handleReset}>
                            Clear Form
                        </Button>
                    </div>
                </form>
            </TabsContent>

            {/* PREVIEW TAB */}
            <TabsContent value="preview">
                {!savedData ? (
                    <p className="italic text-gray-500 text-center">
                        No data saved yet.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {Object.entries(savedData).map(([k, v]) =>
                            typeof v === "string" ? (
                                <p key={k}><strong>{k}:</strong> {v || "-"}</p>
                            ) : null
                        )}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}
