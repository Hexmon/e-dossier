"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useForm, SubmitHandler, Controller } from "react-hook-form";

interface RelegationFormValues {
    ocName: string;
    ocNo: string;
    courseNo: string;
    transferTo: string;
    reason: string;
    remark: string;
    pdfFile: FileList | null;
}

export default function RelegationForm() {
    const {
        register,
        handleSubmit,
        reset,
        control,
    } = useForm<RelegationFormValues>({
        defaultValues: {
            ocName: "",
            ocNo: "",
            courseNo: "",
            transferTo: "",
            reason: "",
            remark: "",
            pdfFile: null,
        },
    });

    const onSubmit: SubmitHandler<RelegationFormValues> = (data) => {
        const {
            ocName,
            ocNo,
            courseNo,
            transferTo,
            reason,
            remark,
            pdfFile,
        } = data;

        const payload = {
            ocName: ocName || "N/A",
            ocNo: ocNo || "N/A",
            courseNo: courseNo || "N/A",
            transferTo: transferTo || "N/A",
            reason: reason || "N/A",
            remark: remark || "N/A",
            pdfFileName: pdfFile?.[0]?.name ?? "No file selected",
        };

        console.log("Relegation Payload:", payload);
        reset();
    };

    return (
        <form
            onSubmit={handleSubmit(onSubmit)}
            className="w-2xl space-y-6 bg-white p-4 rounded-2xl shadow-2xl"
        >
            {/* OC Name */}
            <div className="space-y-2">
                <Label htmlFor="ocName">Name of the OC</Label>
                <Input
                    id="ocName"
                    placeholder="Enter OC name"
                    {...register("ocName")}
                />
            </div>

            {/* OC No */}
            <div className="space-y-2">
                <Label htmlFor="ocNo">OC No</Label>
                <Input
                    id="ocNo"
                    placeholder="Enter OC number"
                    {...register("ocNo")}
                />
            </div>

            {/* Course No */}
            <div className="space-y-2">
                <Label htmlFor="courseNo">Course No</Label>
                <Controller
                    name="courseNo"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id="courseNo">
                                <SelectValue placeholder="Select course number" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TES-50">TES-50</SelectItem>
                                <SelectItem value="TES-51">TES-51</SelectItem>
                                <SelectItem value="TES-52">TES-52</SelectItem>
                                <SelectItem value="TES-53">TES-53</SelectItem>
                                <SelectItem value="TES-54">TES-54</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

            {/* Transfer To */}
            <div className="space-y-2">
                <Label htmlFor="transferTo">Transfer To</Label>
                <Controller
                    name="transferTo"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id="transferTo">
                                <SelectValue placeholder="Select transfer destination" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TES-50">TES-50</SelectItem>
                                <SelectItem value="TES-51">TES-51</SelectItem>
                                <SelectItem value="TES-52">TES-52</SelectItem>
                                <SelectItem value="TES-53">TES-53</SelectItem>
                                <SelectItem value="TES-54">TES-54</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
            </div>

            {/* Reason */}
            <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                    id="reason"
                    placeholder="Enter reason"
                    {...register("reason")}
                    rows={4}
                />
            </div>

            {/* PDF Upload */}
            <div className="space-y-2">
                <Label htmlFor="pdfFile">Choose PDF</Label>
                <Input
                    id="pdfFile"
                    type="file"
                    accept="application/pdf"
                    {...register("pdfFile")}
                />
            </div>

            {/* Remark */}
            <div className="space-y-2">
                <Label htmlFor="remark">Remark</Label>
                <Input
                    id="remark"
                    placeholder="Additional remarks"
                    {...register("remark")}
                />
            </div>

            {/* Submit */}
            <div className="pt-4 flex justify-center">
                <Button type="submit">
                    Submit
                </Button>
            </div>
        </form>
    );
}