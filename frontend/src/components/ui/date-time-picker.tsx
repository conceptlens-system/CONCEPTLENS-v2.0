"use client"

import * as React from "react"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    className?: string
}

export function DateTimePicker({ date, setDate, className }: DateTimePickerProps) {
    const handleSelect = (day: Date | undefined) => {
        if (!day) {
            setDate(undefined)
            return
        }

        const newDate = new Date(day)
        // Preserve time if previously set, else default to current time
        if (date) {
            newDate.setHours(date.getHours())
            newDate.setMinutes(date.getMinutes())
        } else {
            const now = new Date()
            newDate.setHours(now.getHours())
            newDate.setMinutes(now.getMinutes())
        }
        setDate(newDate)
    }

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = e.target.value
        if (!time) return

        const [hours, minutes] = time.split(':').map(Number)
        const newDate = date ? new Date(date) : new Date()
        newDate.setHours(hours)
        newDate.setMinutes(minutes)
        setDate(newDate)
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP p") : <span>Pick a date time</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleSelect}
                    initialFocus
                />
                <div className="p-3 border-t">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-500" />
                        <Input
                            type="time"
                            className="w-full"
                            value={date ? format(date, "HH:mm") : ""}
                            onChange={handleTimeChange}
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
