"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface AnalyticsData {
  conversations: number;
  messages: number;
  documents: number;
  activeDays: { date: string; count: number }[];
  messageTypes: { type: string; count: number }[];
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Fetch conversation count
        const { count: conversationCount } = await supabase
          .from('conversations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        // Fetch message count
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', user.id);
        
        let messageCount = 0;
        if (conversations) {
          const conversationIds = conversations.map(c => c.id);
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', conversationIds);
          messageCount = count || 0;
        }
        
        // Fetch document count
        const { data: knowledgeSources } = await supabase
          .from('knowledge_sources')
          .select('id')
          .eq('user_id', user.id);
        
        let documentCount = 0;
        if (knowledgeSources) {
          const sourceIds = knowledgeSources.map(s => s.id);
          const { count } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .in('source_id', sourceIds);
          documentCount = count || 0;
        }
        
        // Generate mock data for charts (in a real implementation, this would come from the database)
        const activeDays = [
          { date: 'Mon', count: 5 },
          { date: 'Tue', count: 5 },
          { date: 'Wed', count: 7 },
          { date: 'Thu', count: 4 },
          { date: 'Fri', count: 6 },
          { date: 'Sat', count: 3 },
          { date: 'Sun', count: 2 },
        ];
        
        const messageTypes = [
          { type: 'User', count: 42 },
          { type: 'Assistant', count: 58 },
        ];
        
        setData({
          conversations: conversationCount || 0,
          messages: messageCount,
          documents: documentCount,
          activeDays,
          messageTypes,
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>Total conversations created</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.conversations}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Messages</CardTitle>
            <CardDescription>Total messages exchanged</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.messages}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>Knowledge base documents</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.documents}</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Activity by Day</CardTitle>
            <CardDescription>Your conversation activity this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.activeDays}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Message Distribution</CardTitle>
            <CardDescription>User vs Assistant messages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.messageTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.messageTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}