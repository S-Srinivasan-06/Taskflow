import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { format, startOfDay } from 'date-fns';
import { taskApi } from '../api/taskApi';

interface UseTaskFeedParams {
  selectedDate: Date | null;
  activeCategory: string;
  searchQuery: string;
  quickFilter: string;
}

export function useTaskFeed({
  selectedDate, activeCategory, searchQuery, quickFilter,
}: UseTaskFeedParams) {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery.trim());
  const [browserDay, setBrowserDay] = useState(() => startOfDay(new Date()).getTime());

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearchQuery(searchQuery.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    const checkBrowserDay = () => {
      const nextDay = startOfDay(new Date()).getTime();
      setBrowserDay(previousDay => previousDay === nextDay ? previousDay : nextDay);
    };
    const interval = window.setInterval(checkBrowserDay, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const isBidirectional = !selectedDate && !debouncedSearchQuery;
  const todayStr = new Date(browserDay).toISOString();

  // Query 1: Future tasks (or standard unified query if not bidirectional)
  const {
    data: futureData,
    fetchNextPage: fetchNextFuture,
    hasNextPage: hasNextFuture,
    isFetchingNextPage: isFetchingNextFuture,
    status: futureStatus,
    isError: isFutureError,
    refetch: refetchFuture,
  } = useInfiniteQuery({
    queryKey: ['tasks', 'future', browserDay, activeCategory, debouncedSearchQuery, quickFilter, selectedDate?.toISOString()],
    queryFn: ({ pageParam = 0, signal }) => taskApi.searchTasks({
      page: pageParam,
      size: 10,
      search: debouncedSearchQuery || undefined,
      category: activeCategory === 'ALL' ? undefined : activeCategory,
      quickFilter: quickFilter === 'ALL' ? undefined : quickFilter,
      date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
      startDate: isBidirectional ? todayStr : undefined,
      includeUndated: isBidirectional,
      sort: 'dueAt,asc',
    }, signal),
    getNextPageParam: (lastPage) => lastPage.number + 1 < lastPage.totalPages ? lastPage.number + 1 : undefined,
    initialPageParam: 0,
  });

  // Query 2: Past tasks (only active if bidirectional)
  const {
    data: pastData,
    fetchNextPage: fetchNextPast,
    hasNextPage: hasNextPast,
    isFetchingNextPage: isFetchingNextPast,
    status: pastStatus,
    isError: isPastError,
    refetch: refetchPast,
  } = useInfiniteQuery({
    queryKey: ['tasks', 'past', browserDay, activeCategory, quickFilter],
    queryFn: ({ pageParam = 0, signal }) => taskApi.searchTasks({
      page: pageParam,
      size: 10,
      category: activeCategory === 'ALL' ? undefined : activeCategory,
      quickFilter: quickFilter === 'ALL' ? undefined : quickFilter,
      endDate: todayStr,
      sort: 'dueAt,desc',
    }, signal),
    getNextPageParam: (lastPage) => lastPage.number + 1 < lastPage.totalPages ? lastPage.number + 1 : undefined,
    initialPageParam: 0,
    enabled: isBidirectional,
  });

  const futureRef = useRef<HTMLDivElement>(null);
  const pastRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);
  const previousScrollHeight = useRef(0);
  const previousPastTaskCount = useRef(0);

  useEffect(() => {
    if (!hasNextFuture || isFetchingNextFuture) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) fetchNextFuture();
    }, { threshold: 1.0 });
    if (futureRef.current) observer.observe(futureRef.current);
    return () => observer.disconnect();
  }, [fetchNextFuture, hasNextFuture, isFetchingNextFuture]);

  useEffect(() => {
    if (!hasNextPast || isFetchingNextPast || !isBidirectional) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) fetchNextPast();
    }, { threshold: 1.0 });
    if (pastRef.current) observer.observe(pastRef.current);
    return () => observer.disconnect();
  }, [fetchNextPast, hasNextPast, isFetchingNextPast, isBidirectional]);

  const pastTasks = isBidirectional ? [...(pastData?.pages.flatMap(p => p.content) || [])].reverse() : [];
  const futureTasks = futureData?.pages.flatMap(p => p.content) || [];

  const totalCount = (isBidirectional ? pastData?.pages[0]?.totalElements || 0 : 0) + (futureData?.pages[0]?.totalElements || 0);

  useLayoutEffect(() => {
    if (isBidirectional && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const pastTaskCount = pastTasks.length;

      if (!hasAutoScrolled.current && futureTasks.length > 0) {
        const todayMarker = document.getElementById('today-marker');
        if (todayMarker) {
          container.scrollTop = todayMarker.offsetTop - 150; // Offset for header padding
          hasAutoScrolled.current = true;
        }
      } else if (
        pastTaskCount > previousPastTaskCount.current &&
        previousScrollHeight.current > 0 &&
        hasAutoScrolled.current
      ) {
        // Only compensate when older tasks were prepended; future-page appends
        // should leave the user's current viewport unchanged.
        container.scrollTop += container.scrollHeight - previousScrollHeight.current;
      }
      previousScrollHeight.current = container.scrollHeight;
      previousPastTaskCount.current = pastTaskCount;
    }
  }, [pastTasks.length, futureTasks.length, isBidirectional]);

  // Reset auto scroll on filter change
  useEffect(() => {
    hasAutoScrolled.current = false;
    previousScrollHeight.current = 0;
    previousPastTaskCount.current = 0;
  }, [activeCategory, quickFilter, selectedDate, debouncedSearchQuery, browserDay]);

  const retryQueries = () => {
    if (isFutureError) void refetchFuture();
    if (isBidirectional && isPastError) void refetchPast();
  };

  return {
    pastTasks,
    futureTasks,
    totalCount,
    isBidirectional,
    isFetchingNextPast,
    isFetchingNextFuture,
    futureRef,
    pastRef,
    scrollContainerRef,
    isError: isFutureError || (isBidirectional && isPastError),
    isLoading: futureStatus === 'pending' || (isBidirectional && pastStatus === 'pending'),
    retryQueries,
  };
}
