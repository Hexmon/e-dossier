import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";
import { resolveToneClasses } from "@/lib/theme-color";
import type { PublicEventNews } from "@/app/lib/public-site-settings";

const TYPE_TONE = {
  event: "info",
  news: "warning",
} as const;

function formatLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type EventsNewsProps = {
  items: PublicEventNews[];
};

const EventsNews = ({ items }: EventsNewsProps) => {
  return (
    <section id="events-news" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
            Important Events & News
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Stay updated with the latest events, training schedules, and important announcements
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-md border bg-muted/20 p-6 text-center text-muted-foreground">
            Events and news are currently unavailable.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {items.map((item) => (
              <Card key={item.id} className="hover:shadow-elegant transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between mb-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{formatLocalDate(item.date)}</span>
                    </div>
                    <Badge className={resolveToneClasses(TYPE_TONE[item.type], "subtle")}>
                      {item.type === "event" ? "Event" : "News"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
                </CardHeader>

                <CardContent>
                  <p className="text-muted-foreground mb-3 leading-relaxed">{item.description}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{item.location}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default EventsNews;
