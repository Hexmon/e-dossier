"use client";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PendingUser, PositionSlot } from "@/app/lib/api/ApprovalApi";

interface Props {
    user: PendingUser;
    slots: PositionSlot[];
    onSelectSlot: (value: string) => void;
    onApprove: () => void;
    onReject: () => void;
}

export function PendingUserItem({
    user,
    slots,
    onSelectSlot,
    onApprove,
    onReject,
}: Props) {
    const {
        id,
        username = "unknown",
        name = "N/A",
        rank = "N/A",
        email = "N/A",
        phone = "N/A",
    } = user;

    const uniqueSlots = [
        ...new Map(slots.map((slot) => [slot.position.key, slot])).values(),
    ];

    return (
        <div
            key={id}
            className="p-4 flex items-center justify-between border-b hover:bg-muted/20"
        >
            <div>
                <p className="font-semibold">{name}</p>
                <p className="text-sm text-muted-foreground">
                    {rank} • {email} • {phone}
                </p>
                <p className="text-xs text-muted-foreground">{username}</p>
            </div>

            <div className="flex items-center gap-3">
                <Select onValueChange={(value) => onSelectSlot(value)}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Select Appointment" />
                    </SelectTrigger>

                    <SelectContent>
                        {uniqueSlots.length > 0 ? (
                            uniqueSlots.map((slot) => {
                                const { position } = slot;
                                return (
                                    <SelectItem key={position.key} value={position.key}>
                                        {position.displayName}
                                    </SelectItem>
                                );
                            })
                        ) : (
                            <SelectItem value="none" disabled>
                                No slots available
                            </SelectItem>
                        )}
                    </SelectContent>
                </Select>

                <Button onClick={onApprove}>Approve</Button>

                <Button variant="destructive" onClick={onReject}>
                    Reject
                </Button>
            </div>
        </div>
    );
}