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

interface Props {
    ocId: string;
    onSave?: (data: OfficerCadetForm) => void;
}

export default function OfficerCadetFormComponent({ ocId, onSave }: Props) {
    const dispatch = useDispatch();

    // Get persisted data from Redux
    const savedData = useSelector((state: RootState) =>
        state.officerCadetForm.forms[ocId]
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

    const formValues = watch();
    const debouncedFormValues = useDebounce(formValues, 500); // 500ms delay

    useEffect(() => {
        if (savedData) {
            reset(savedData);
        }
    }, [ocId, savedData, reset]);

    useEffect(() => {
        if (debouncedFormValues && Object.keys(debouncedFormValues).length > 0) {
            const hasAnyData = Object.values(debouncedFormValues).some(val => {
                if (val === null || val === undefined || val === "") return false;
                if (typeof val === "object" && val !== null && "length" in val) {
                    return (val as FileList).length > 0;
                }
                return true;
            });

            if (hasAnyData) {
                dispatch(saveForm({ ocId, data: debouncedFormValues as OfficerCadetForm }));
            }
        }
    }, [debouncedFormValues, dispatch, ocId]);

    const onSubmit = (data: OfficerCadetForm) => {
        const { name = "" } = data;
        if (!name.trim()) {
            toast.error("Please provide the cadet name");
            return;
        }

        dispatch(saveForm({ ocId, data }));
        onSave?.(data);
        toast.success("Form saved successfully");
    };

    const handleReset = () => {
        if (confirm("Are you sure you want to clear all form data? This cannot be undone.")) {
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
        }
    };

    return (
        <div>
            <Tabs defaultValue="form">
                <TabsList className="mb-4">
                    <TabsTrigger value="form">Fill Form</TabsTrigger>
                    <TabsTrigger value="preview">Preview Data</TabsTrigger>
                </TabsList>

                <div className="w-full">
                    <TabsContent value="form">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Auto-save indicator */}
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
                                <div><Label className="ml-1 mb-1">TES No</Label><Input {...register("tesNo")} /></div>
                                <div><Label className="ml-1 mb-1">Name</Label><Input {...register("name")} /></div>
                                <div><Label className="ml-1 mb-1">Course</Label><Input {...register("course")} /></div>
                                <div><Label className="ml-1 mb-1">PI</Label><Input {...register("pi")} /></div>
                                <div><Label className="ml-1 mb-1">Date of Arrival</Label><Input type="date" {...register("dtOfArr")} /></div>
                                <div><Label className="ml-1 mb-1">Relegated to Course & Date</Label><Input {...register("relegated")} /></div>
                                <div><Label className="ml-1 mb-1">Withdrawn On</Label><Input type="date" {...register("withdrawnOn")} /></div>
                            </div>

                            <h3 className="text-lg font-semibold bg-blue-100 px-4 py-1 rounded-2xl">Commissioning Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label className="ml-1 mb-1">Date of Passing Out</Label><Input type="date" {...register("dtOfPassingOut")} /></div>
                                <div><Label className="ml-1 mb-1">IC No</Label><Input {...register("icNo")} /></div>
                                <div><Label className="ml-1 mb-1">Order of Merit</Label><Input {...register("orderOfMerit")} /></div>
                                <div><Label className="ml-1 mb-1">Regt/Arm Allotted</Label><Input {...register("regtArm")} /></div>
                                <div className="col-span-2"><Label className="ml-1 mb-1">Posted/Attached To</Label><Input {...register("postedAtt")} /></div>
                            </div>

                            <div className="flex justify-center mt-6 gap-4">
                                <Button type="submit" className="w-40 bg-[#40ba4d]">Submit</Button>
                                <Button type="button" variant="outline" className="w-40 hover:bg-destructive hover:text-white" onClick={handleReset}>Clear Form</Button>
                            </div>
                        </form>
                    </TabsContent>

                    <TabsContent value="preview">
                        <div className="p-4 bg-gray-50 rounded">
                            {!savedData ? (
                                <p className="text-gray-500 italic text-center">No data saved yet. Fill and save the form first.</p>
                            ) : (
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Preview</h3>
                                    <div className="grid grid-cols-2 gap-6 mb-6">
                                        {savedData.arrivalPhoto?.[0] ? (
                                            <div className="flex flex-col items-center">
                                                <img src={URL.createObjectURL(savedData.arrivalPhoto[0])} alt="Arrival" className="h-32 w-32 object-cover rounded border" />
                                                <p className="mt-2 text-sm text-gray-600">Arrival (Civil Dress)</p>
                                            </div>
                                        ) : <p className="text-gray-500 italic">No arrival photo</p>}

                                        {savedData.departurePhoto?.[0] ? (
                                            <div className="flex flex-col items-center">
                                                <img src={URL.createObjectURL(savedData.departurePhoto[0])} alt="Departure" className="h-32 w-32 object-cover rounded border" />
                                                <p className="mt-2 text-sm text-gray-600">Departure (Uniform)</p>
                                            </div>
                                        ) : <p className="text-gray-500 italic">No departure photo</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        {Object.entries({
                                            Name: savedData.name,
                                            "TES No": savedData.tesNo,
                                            Course: savedData.course,
                                            PI: savedData.pi,
                                            "Date of Arrival": savedData.dtOfArr,
                                            Relegated: savedData.relegated,
                                            "Withdrawn On": savedData.withdrawnOn,
                                            "Date of Passing Out": savedData.dtOfPassingOut,
                                            "IC No": savedData.icNo,
                                            "Order of Merit": savedData.orderOfMerit,
                                            "Regt/Arm": savedData.regtArm,
                                            "Posted/Attached To": savedData.postedAtt,
                                        }).map(([label, value]) => (
                                            <p key={label}><strong>{label}:</strong> {value || "-"}</p>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}