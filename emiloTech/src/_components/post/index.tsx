import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "../../_lib/axios";
import { HiHeart } from "react-icons/hi";
import { BiShow } from "react-icons/bi";
import { useInView } from "motion/react"

type PostType = {
    _id: string;
    caption: string;
    fileURL?: string;
    createdAt: string;
    updatedAt: string;
    views: number;
    likes: number;
    hasViewed: boolean;
    hasLiked: boolean;
    claimed: boolean;
    isOwner: boolean;
};

type FeedResponse = {
    success: boolean;
    msg: string;
    data: {
        posts: PostType[];
        pagination: {
            offset: number;
            limit: number;
            total: number;
            hasMore: boolean;
        };
    };
};

type InteractionHandler = (args: { postID: string, type: 'like' | 'view' }) => void


const fetchPosts = async ({ pageParam = 0 }): Promise<FeedResponse> => {
    const res = await axios.get("/feed", {
        params: { offset: pageParam, limit: 5 },
    });
    return res.data;
};

export default function Post() {

    const [showForm, setShowForm] = useState(false);
    const [caption, setCaption] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [fileUrl, setFileUrl] = useState<string>('');

    const [offset, setOffset] = useState(0);

    const {
        data,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: ["posts", offset],
        queryFn: () => fetchPosts({ pageParam: offset }),
    });

    const mutation = useMutation({
        mutationFn: async (formData: FormData) => {
            return axios.post("/create-post", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        },
        onSuccess: () => {
            refetch();
            setShowForm(false);
            setCaption("");
            setFile(null);
        },
    });

    const interactionMutation = useMutation({
        mutationFn: async (formData: { postID: string, type: 'like' | 'view' }) => {
            return axios.post("/post-interaction", formData);
        },
        onSuccess: () => {
            refetch();
        },
    });

    const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        try {

            const formData = new FormData();
            formData.append("caption", caption);
            if (file) formData.append("file", file);
            mutation.mutate(formData);

        } catch (error) {
            alert('something went wrong');
            console.log(error);
        }
    };

    const posts = data?.data?.posts || [];
    const hasMore = data?.data?.pagination?.hasMore || false;

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 to-gray-800 flex flex-col items-center py-8 px-2">
            {/* Header */}
            <div className="flex w-full items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-white">📢 Post Feed</h1>
                <button
                    onClick={() => setShowForm(v => !v)}
                    className="bg-blue-600 hover:bg-blue-700 transition text-white px-4 py-2 rounded-md shadow-lg font-semibold"
                >
                    {showForm ? "Cancel" : "Create Post"}
                </button>
            </div>

            {/* Post creation form */}
            {showForm && (
                <form
                    onSubmit={handleCreatePost}
                    className="bg-gray-900 rounded-lg shadow-lg p-5 w-full max-w-xl mb-8 flex flex-col space-y-4"
                >
                    <label className="text-white font-medium">Caption</label>
                    <input
                        type="text"
                        value={caption}
                        onChange={e => setCaption(e.target.value)}
                        className="px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 outline-none"
                        required
                        maxLength={200}
                    />
                    <label className="text-white font-medium">Optional File (Image/Video)</label>
                    {
                        file ? (
                            <img
                                src={fileUrl}
                                height={300}
                                width={200}
                                className="aspect-auto"
                            />
                        ) : null
                    }
                    <input
                        type="file"
                        onChange={e => {
                            setFile(e.target.files?.[0] || null)
                            if (e.target.files?.[0]) {
                                const url = URL.createObjectURL(e.target.files[0]);
                                setFileUrl(url);
                            }
                        }}
                        className="text-white"
                        accept="image/*,video/*"
                    />
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="bg-green-600 hover:bg-green-700 transition text-white px-4 py-2 rounded font-bold shadow"
                    >
                        {mutation.isPending ? "Posting..." : "Post"}
                    </button>
                    {mutation.isError && (
                        <div className="text-red-500 text-sm">Error: Unable to create post</div>
                    )}
                </form>
            )}

            {/* Posts Feed */}
            <div className="w-full max-w-xl flex flex-col gap-6">
                {isLoading ? (
                    <div className="text-center text-gray-200 py-10">Loading posts...</div>
                ) : isError ? (
                    <div className="text-center text-red-500 py-10">Error loading posts.</div>
                ) : posts.length === 0 ? (
                    <div className="text-center text-white py-10">No posts yet.</div>
                ) : (
                    posts.map(post => (
                        <PostCard post={post} key={post._id} interactionHandler={interactionMutation.mutate} />
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            <div className="flex w-full max-w-xl justify-between mt-8">
                <button
                    disabled={offset === 0}
                    onClick={() => setOffset(prev => Math.max(0, prev - 5))}
                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded"
                >
                    Previous
                </button>
                <button
                    disabled={!hasMore}
                    onClick={() => setOffset(prev => prev + 5)}
                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded"
                >
                    Next
                </button>
            </div>
        </div>
    );
}


function PostCard({ post, interactionHandler }: { post: PostType, interactionHandler: InteractionHandler }) {

    const ref = useRef(null);
    const [claimed, setClaimed] = useState(false);

    const isInView = useInView(ref, {
        once: true,
        amount: 'all',
        initial: false
    });

    const mutation = useMutation({
        mutationFn: async (formData: { postID: string }) => {
            return axios.post("/post-claim-submission", formData);
        },
        onSuccess: (data) => {
            if (data.data.success) {
                setClaimed(true);
                alert('claim created');
            } else if (!data.data.success) {
                alert(data?.data?.msg || 'something wetnw rong')
            }
        },
    });

    useEffect(() => {
        if (isInView && !post.hasViewed) {
            interactionHandler({
                postID: post._id,
                type: 'view'
            })
        }
    }, [isInView])

    return (
        <div
            ref={ref}
            className="bg-gray-900 border border-gray-800 rounded-xl shadow-md p-5 flex flex-col sm:flex-row gap-5"
        >
            {/* File (if present) */}
            {post.fileURL && (
                <div className="flex-shrink-0 w-full sm:w-40 max-h-[15rem] overflow-hidden mb-3 sm:mb-0">
                    <img src={post.fileURL} alt="post file" height={'100%'} className="w-full h-full rounded object-contain" />
                </div>
            )}
            <div className="flex flex-col md:justify-start justify-end gap-5 md:flex-col-reverse">

                <div className="flex justify-between items-center">
                    <div className="flex gap-4 text-white items-center">
                        <HiHeart onClick={() => interactionHandler({ postID: post._id, type: 'like' })} className={`text-3xl ${ post.hasLiked ? 'text-red-600' : 'text-white' } `} />
                        {post.likes}
                        <BiShow className="text-3xl" />
                        {post.views}
                    </div>
                    {
                        (!post.claimed && post.isOwner && !claimed) ? (
                            <button onClick={() => mutation.mutate({ postID: post._id })} disabled={mutation.isPending} className=" py-1 px-2 rounded-md bg-blue-700 text-white font-semibold">
                                {mutation.isPending ? "Submitting.." : 'Submit claim'}
                            </button>
                        ) : null
                    }
                </div>

                {/* Caption and meta */}
                <div>
                    <div className="text-lg text-white font-semibold mb-2 break-words">
                        {post.caption}
                    </div>
                    <div className="text-xs text-gray-400 mt-auto">
                        Created: {new Date(post.createdAt).toLocaleString()}
                        <span className="mx-2 text-gray-600">|</span>
                        Updated: {new Date(post.updatedAt).toLocaleString()}
                    </div>
                </div>
            </div>

        </div>
    )
}